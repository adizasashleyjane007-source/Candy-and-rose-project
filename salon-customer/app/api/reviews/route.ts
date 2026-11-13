import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getAuthenticatedContext(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) {
    return { error: "Authentication required.", status: 401 as const };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return { error: "Invalid or expired session.", status: 401 as const };
  }

  let customerRow: any = null;
  const emailLower = user.email?.trim().toLowerCase();

  if (emailLower) {
    const { data } = await supabase
      .from("customers")
      .select("id, name, full_name, email, user_id")
      .or(`user_id.eq.${user.id},email.ilike.${emailLower}`)
      .limit(1)
      .maybeSingle();
    customerRow = data;
  } else {
    const { data } = await supabase
      .from("customers")
      .select("id, name, full_name, email, user_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    customerRow = data;
  }

  return { supabase, user, customerRow };
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    if ("error" in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const { supabase, customerRow } = ctx;
    if (!customerRow?.id) {
      return NextResponse.json({ appointments: [] });
    }

    const [aptsRes, staffRes] = await Promise.all([
      supabase
        .from("appointments")
        .select(
          "id, service_name, staff_id, staff_name, appointment_date, appointment_time, status, services(name), staff(id, name, role)"
        )
        .eq("customer_id", customerRow.id)
        .eq("status", "Completed")
        .order("appointment_date", { ascending: false }),
      supabase.from("staff").select("id, name, role, employment_status"),
    ]);

    if (aptsRes.error) {
      return NextResponse.json(
        { error: "Failed to load completed appointments." },
        { status: 500 }
      );
    }

    const completedApts = aptsRes.data || [];
    const staffList = staffRes.data || [];
    const aptIds = completedApts.map((a: any) => a.id).filter(Boolean);

    let existingReviews: any[] = [];
    if (aptIds.length > 0) {
      const { data: revData } = await supabase
        .from("reviews")
        .select("id, appointment_id, staff_id, rating, review, created_at")
        .in("appointment_id", aptIds);
      existingReviews = revData || [];
    }

    const reviewByAptId = new Map<string, any>();
    existingReviews.forEach((r) => {
      if (r.appointment_id) reviewByAptId.set(r.appointment_id, r);
    });

    const formatted = completedApts.map((apt: any) => {
      let resolvedStaffId: string | null = apt.staff_id || apt.staff?.id || null;
      let resolvedStaffName: string = (
        apt.staff?.name ||
        apt.staff_name ||
        ""
      ).trim();
      let resolvedStaffRole: string = apt.staff?.role || "";

      if (
        !resolvedStaffId &&
        resolvedStaffName &&
        resolvedStaffName.toLowerCase() !== "auto-assigned"
      ) {
        const matched = staffList.find(
          (s: any) =>
            s.name?.trim().toLowerCase() === resolvedStaffName.toLowerCase()
        );
        if (matched) {
          resolvedStaffId = matched.id;
          resolvedStaffName = matched.name;
          resolvedStaffRole = matched.role || "";
        }
      }

      const existing = reviewByAptId.get(apt.id) || null;
      return {
        id: apt.id,
        service_name: apt.services?.name || apt.service_name || "Salon Service",
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time,
        staff_id: resolvedStaffId,
        staff_name: resolvedStaffName || null,
        staff_role: resolvedStaffRole || null,
        has_assigned_staff: Boolean(resolvedStaffId),
        already_reviewed: Boolean(existing),
        existing_review: existing,
      };
    });

    return NextResponse.json({ appointments: formatted });
  } catch (err: any) {
    console.error("GET /api/reviews error:", err);
    return NextResponse.json(
      { error: "Failed to fetch reviewable appointments." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    if ("error" in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const { supabase, user, customerRow } = ctx;
    if (!customerRow?.id) {
      return NextResponse.json(
        { error: "Customer profile not found." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const appointmentId = String(body.appointmentId || "").trim();
    const ratingNum = Number(body.rating);
    const reviewText = String(body.review || "").trim();
    const reviewImage = body.reviewImage ? String(body.reviewImage) : null;

    if (!appointmentId) {
      return NextResponse.json(
        { error: "Please select a completed appointment to review." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json(
        { error: "Please rate your staff before submitting your review." },
        { status: 400 }
      );
    }

    if (reviewText.length < 10) {
      return NextResponse.json(
        { error: "Your review must contain at least 10 characters." },
        { status: 400 }
      );
    }

    if (reviewText.length > 500) {
      return NextResponse.json(
        { error: "Your review cannot exceed 500 characters." },
        { status: 400 }
      );
    }

    // Fetch appointment and verify ownership, status, and assigned staff
    const { data: apt, error: aptErr } = await supabase
      .from("appointments")
      .select("id, customer_id, status, staff_id, staff_name, staff(id, name)")
      .eq("id", appointmentId)
      .maybeSingle();

    if (aptErr || !apt) {
      return NextResponse.json(
        { error: "Appointment not found." },
        { status: 404 }
      );
    }

    if (apt.customer_id !== customerRow.id) {
      return NextResponse.json(
        { error: "You can only review your own appointments." },
        { status: 403 }
      );
    }

    if (String(apt.status || "").trim() !== "Completed") {
      return NextResponse.json(
        { error: "Only completed appointments can be reviewed." },
        { status: 400 }
      );
    }

    let resolvedStaffId: string | null = apt.staff_id || (apt.staff as any)?.id || null;
    let resolvedStaffName: string = ((apt.staff as any)?.name || apt.staff_name || "").trim();

    if (
      !resolvedStaffId &&
      resolvedStaffName &&
      resolvedStaffName.toLowerCase() !== "auto-assigned"
    ) {
      const { data: staffRow } = await supabase
        .from("staff")
        .select("id, name")
        .ilike("name", resolvedStaffName)
        .limit(1)
        .maybeSingle();
      if (staffRow) {
        resolvedStaffId = staffRow.id;
        resolvedStaffName = staffRow.name;
      }
    }

    if (!resolvedStaffId) {
      return NextResponse.json(
        {
          error:
            "This appointment does not have an assigned staff member to rate.",
        },
        { status: 400 }
      );
    }

    // Prevent duplicate reviews for the same appointment
    const { data: existingReview } = await supabase
      .from("reviews")
      .select("id")
      .eq("appointment_id", appointmentId)
      .maybeSingle();

    if (existingReview) {
      return NextResponse.json(
        { error: "This appointment has already been reviewed." },
        { status: 409 }
      );
    }

    const resolvedCustomerName =
      customerRow.full_name ||
      customerRow.name ||
      user.email?.split("@")[0] ||
      "Candy & Rose guest";

    const { data: inserted, error: insertErr } = await supabase
      .from("reviews")
      .insert({
        customer_id: customerRow.id,
        customer_name: resolvedCustomerName,
        appointment_id: appointmentId,
        staff_id: resolvedStaffId,
        rating: ratingNum,
        review: reviewText,
        review_image: reviewImage,
        status: "approved",
      })
      .select("id, customer_id, customer_name, appointment_id, staff_id, rating, review, review_image, created_at")
      .single();

    if (insertErr) {
      if (insertErr.code === "23505") {
        return NextResponse.json(
          { error: "This appointment has already been reviewed." },
          { status: 409 }
        );
      }
      console.error("Failed to insert review:", insertErr);
      return NextResponse.json(
        { error: insertErr.message || "Failed to submit review." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      review: inserted,
      staffName: resolvedStaffName,
    });
  } catch (err: any) {
    console.error("POST /api/reviews error:", err);
    return NextResponse.json(
      { error: "Failed to submit review." },
      { status: 500 }
    );
  }
}

