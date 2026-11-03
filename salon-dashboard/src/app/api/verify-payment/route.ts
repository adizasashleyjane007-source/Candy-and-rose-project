import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fulfillPaymentSuccess } from "@/lib/db";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { appointmentId, sessionId } = await req.json();

    if (!appointmentId) {
      return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });
    }

    // 1. Check appointment in database
    const { data: apt, error: aptError } = await supabase
      .from("appointments")
      .select("*, customers(name, email), services(name, price)")
      .eq("id", appointmentId)
      .maybeSingle();

    if (aptError || !apt) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // 2. If already marked Completed (e.g. by PayMongo webhook), confirm success idempotently
    if (apt.status === "Completed") {
      const { data: bill } = await supabase
        .from("billing")
        .select("amount, payment_method, status")
        .eq("appointment_id", appointmentId)
        .maybeSingle();

      return NextResponse.json({
        verified: true,
        alreadyCompleted: true,
        customerName: apt.customers?.name || apt.customer_name || "Valued Customer",
        serviceName: apt.services?.name || apt.service_name || "Salon Service",
        amount: bill?.amount || apt.price || 0,
        paymentMethod: bill?.payment_method || apt.payment_method || "GCash",
      });
    }

    // 3. If not yet completed, verify directly with PayMongo API
    const secretKey = process.env.PAYMONGO_SECRET_KEY;
    if (!secretKey) {
      console.error("[Verify Payment] PayMongo secret key is not configured");
      return NextResponse.json({ error: "PayMongo secret key is not configured" }, { status: 500 });
    }

    // Determine checkout session id: passed explicitly or fetched from billing record notes
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      const { data: pendingBill } = await supabase
        .from("billing")
        .select("notes")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingBill?.notes) {
        const match = pendingBill.notes.match(/paymongo_session_id:(cs_[a-zA-Z0-9_-]+)/);
        if (match) {
          activeSessionId = match[1];
        }
      }
    }

    if (!activeSessionId) {
      console.warn(`[Verify Payment] No session id found for appointment ${appointmentId}`);
      return NextResponse.json(
        { verified: false, error: "No checkout session reference found to verify with PayMongo" },
        { status: 400 }
      );
    }

    // Query PayMongo Checkout Session
    const authHeader = `Basic ${Buffer.from(secretKey + ":").toString("base64")}`;
    const pmResponse = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${activeSessionId}`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!pmResponse.ok) {
      const pmErr = await pmResponse.json().catch(() => ({}));
      console.error("[Verify Payment] PayMongo API error:", pmErr);
      return NextResponse.json(
        { verified: false, error: "Unable to retrieve checkout session from PayMongo" },
        { status: 502 }
      );
    }

    const pmData = await pmResponse.json();
    const attributes = pmData?.data?.attributes;

    const sessionStatus = attributes?.status;
    const paymentIntentStatus = attributes?.payment_intent?.attributes?.status;
    const payments = attributes?.payments || [];
    const hasPaidPayment = payments.some((p: any) => p?.attributes?.status === "paid");

    const isPaid = sessionStatus === "paid" || paymentIntentStatus === "succeeded" || hasPaidPayment;

    // Safety verification: check appointment_id or reference_number in PayMongo metadata
    const metaApptId = attributes?.metadata?.appointment_id || attributes?.reference_number;
    if (metaApptId && metaApptId !== appointmentId) {
      console.error(`[Verify Payment] Mismatched appointment ID: expected ${appointmentId}, got ${metaApptId}`);
      return NextResponse.json(
        { verified: false, error: "Security check failed: appointment mismatch" },
        { status: 403 }
      );
    }

    if (!isPaid) {
      console.warn(`[Verify Payment] PayMongo session ${activeSessionId} is not paid. Status: ${sessionStatus}`);
      return NextResponse.json({
        verified: false,
        status: sessionStatus,
        error: "Payment has not been completed or authorized.",
      });
    }

    // Payment verified! Fulfill appointment and billing record
    const amountInCentavos =
      attributes?.payment_intent?.attributes?.amount ||
      attributes?.line_items?.[0]?.amount ||
      0;
    const amountInPHP = amountInCentavos > 0 ? amountInCentavos / 100 : (apt.price || 0);

    const fulfillment = await fulfillPaymentSuccess({
      appointmentId,
      amount: amountInPHP,
      paymentMethod: "GCash",
      notes: `Paid via PayMongo Checkout (${activeSessionId})`,
    });

    if (!fulfillment.success) {
      return NextResponse.json(
        { verified: false, error: fulfillment.error || "Failed to update records" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      verified: true,
      customerName: apt.customers?.name || apt.customer_name || "Valued Customer",
      serviceName: apt.services?.name || apt.service_name || "Salon Service",
      amount: amountInPHP,
      paymentMethod: "GCash",
    });
  } catch (err: any) {
    console.error("[Verify Payment] Internal server error:", err);
    return NextResponse.json(
      { verified: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

