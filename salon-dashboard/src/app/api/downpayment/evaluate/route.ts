import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  evaluateDownpaymentRules,
  DEFAULT_DOWNPAYMENT_SETTINGS,
  DownpaymentRulesSettings,
} from "@/lib/downpayment";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Server-Side Downpayment Rule Evaluation.
 * Calculates downpayment from real service records and saved rules.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { serviceIds, appointmentTime, appointmentDate } = body;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch active downpayment rules from salon_settings
    const { data: settingRow } = await supabase
      .from("salon_settings")
      .select("value")
      .eq("key", "downpayment_rules")
      .maybeSingle();

    const settings: DownpaymentRulesSettings =
      settingRow?.value && typeof settingRow.value === "object"
        ? {
            ...DEFAULT_DOWNPAYMENT_SETTINGS,
            ...settingRow.value,
            category_mappings: {
              ...DEFAULT_DOWNPAYMENT_SETTINGS.category_mappings,
              ...(settingRow.value.category_mappings || {}),
            },
          }
        : DEFAULT_DOWNPAYMENT_SETTINGS;

    // 2. Fetch services from database by IDs
    const validIds = Array.isArray(serviceIds) ? serviceIds.filter(Boolean) : [];
    let servicesData: any[] = [];

    if (validIds.length > 0) {
      const { data: svcs } = await supabase
        .from("services")
        .select("id, name, category, price")
        .in("id", validIds);
      servicesData = svcs || [];
    }

    // 3. Evaluate rules
    const evaluation = evaluateDownpaymentRules(
      servicesData,
      appointmentTime || "10:00",
      appointmentDate || new Date().toISOString().split("T")[0],
      settings
    );

    return NextResponse.json({
      success: true,
      evaluation,
      settings: {
        is_enabled: settings.is_enabled,
        downpayment_percentage: settings.downpayment_percentage,
        early_cutoff_time: settings.early_cutoff_time,
        hold_time_hours: settings.hold_time_hours,
      },
    });
  } catch (err: any) {
    console.error("[DOWNPAYMENT EVALUATE ERROR]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to evaluate downpayment rules" },
      { status: 500 }
    );
  }
}

