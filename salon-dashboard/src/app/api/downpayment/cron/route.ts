import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Scheduled Cron Handler: Auto-expires unpaid downpayment holds.
 *
 * Security:
 * - Protected by CRON_SECRET.
 * - FAILS CLOSED (401) if CRON_SECRET is not configured or does not match.
 */
export async function GET(req: NextRequest) {
  try {
    const expectedSecret = process.env.CRON_SECRET?.trim();
    if (!expectedSecret) {
      console.error("[DOWNPAYMENT CRON] CRON_SECRET is not configured. Failing closed.");
      return NextResponse.json(
        { error: "Unauthorized: Server CRON_SECRET is not configured." },
        { status: 401 }
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const xCronSecret = req.headers.get("x-cron-secret") || "";
    const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";

    const isAuthorized =
      bearerToken === expectedSecret || xCronSecret === expectedSecret;

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing cron secret." },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const nowIso = new Date().toISOString();

    // Find all active 'Pending Downpayment' appointments whose hold time has passed
    const { data: expiredHolds, error: fetchErr } = await supabase
      .from("appointments")
      .select("id, customer_name, service_name, appointment_date, appointment_time, downpayment_hold_until")
      .eq("status", "Pending Downpayment")
      .lt("downpayment_hold_until", nowIso);

    if (fetchErr) {
      console.error("[DOWNPAYMENT CRON] Fetch error:", fetchErr);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    const expiredList = expiredHolds || [];
    let expiredCount = 0;

    for (const apt of expiredList) {
      const { error: updateErr } = await supabase
        .from("appointments")
        .update({
          status: "Cancelled",
          cancellation_reason: "Hold expired: Unpaid downpayment",
          downpayment_status: "Expired",
        })
        .eq("id", apt.id);

      if (!updateErr) {
        expiredCount += 1;

        // Record audit entry in appointment_downpayments
        try {
          await supabase.from("appointment_downpayments").insert({
            appointment_id: apt.id,
            amount: 0.01,
            payment_method: "System",
            recorded_by: "System Cron",
            action: "FORFEITED",
            notes: "Unpaid downpayment hold expired automatically.",
          });

          // Notify staff of released slot
          await supabase.from("notifications").insert({
            title: "⏰ Slot Released: Unpaid Downpayment Expired",
            message: `Booking for ${apt.customer_name} (${apt.service_name}) on ${apt.appointment_date} at ${apt.appointment_time} was released because the downpayment hold expired.`,
            type: "appointment",
            is_read: false,
          });
        } catch {}
      }
    }

    return NextResponse.json({
      success: true,
      expiredCount,
      timestamp: nowIso,
      expiredAppointments: expiredList.map((a) => a.id),
    });
  } catch (err: any) {
    console.error("[DOWNPAYMENT CRON] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal cron error" },
      { status: 500 }
    );
  }
}

