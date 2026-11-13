/**
 * Centralized Downpayment Rules Engine & Configuration (Customer App)
 *
 * Rules:
 * - Rule A: Booking contains both a Hair service and a Make-up service.
 * - Rule B: Booking contains a Hair or Nail service and starts before early cutoff (default 10:00 AM).
 * - Hold time: Earlier of (now + hold hours) and (appointment start minus 2 hours).
 * - Pricing safety: If total price is ₱0, downpayment is NOT created and booking is flagged for staff pricing.
 * - Timezone: Strictly calculated in Asia/Manila (UTC+8).
 */

export type DownpaymentStatus =
  | "Not Required"
  | "Pending"
  | "Partial"
  | "Paid"
  | "Waived"
  | "Refunded"
  | "Forfeited"
  | "Expired";

export interface CategoryMappings {
  hair_categories: string[];
  makeup_categories: string[];
  nail_categories: string[];
}

export interface DownpaymentRulesSettings {
  is_enabled: boolean;
  downpayment_percentage: number; // default 50
  early_cutoff_time: string; // default "10:00" (24-hour HH:MM)
  hold_time_hours: number; // default 24
  rule_a_hair_makeup_enabled: boolean;
  rule_b_early_hair_nail_enabled: boolean;
  category_mappings: CategoryMappings;
}

export const DEFAULT_DOWNPAYMENT_SETTINGS: DownpaymentRulesSettings = {
  is_enabled: true,
  downpayment_percentage: 50,
  early_cutoff_time: "10:00",
  hold_time_hours: 24,
  rule_a_hair_makeup_enabled: true,
  rule_b_early_hair_nail_enabled: true,
  category_mappings: {
    hair_categories: ["HAIR CARE", "HAIRCUT & STYLING", "TREATMENTS & SERVICES"],
    makeup_categories: ["Makeup"],
    nail_categories: ["NAIL ART", "Nails"],
  },
};

export interface ServiceForDownpayment {
  id?: string;
  name?: string;
  category?: string | null;
  price?: number | null;
}

export interface DownpaymentEvaluationResult {
  required: boolean;
  reasons: string[];
  percentage: number;
  totalServicePrice: number;
  downpaymentAmount: number;
  downpaymentStatus: DownpaymentStatus;
  holdUntil: string | null; // ISO string in UTC/PHT
  pricingFlag?: string | null;
  ruleATriggered: boolean;
  ruleBTriggered: boolean;
}

/**
 * Normalizes time strings into minutes from midnight (0-1439).
 */
export function timeStringToMinutes(timeStr?: string | null): number {
  if (!timeStr) return -1;
  const cleaned = timeStr.trim().toUpperCase();

  const match12 = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridiem = match12[3];

    if (meridiem === "PM" && hours < 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  const parts = cleaned.split(":");
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (!isNaN(hours) && !isNaN(minutes)) {
      return hours * 60 + minutes;
    }
  }

  return -1;
}

/**
 * Calculates holdUntil timestamp in Asia/Manila (UTC+8):
 * holdUntil = earlier of (now + holdHours) and (appointment start minus 2 hours).
 */
export function calculateHoldUntil(
  appointmentDateStr: string,
  appointmentTimeStr: string,
  holdHours: number = 24,
  now: Date = new Date()
): string {
  const deadlineA = new Date(now.getTime() + holdHours * 3600 * 1000);

  const cleanDate = appointmentDateStr.split("T")[0];
  const minutes = timeStringToMinutes(appointmentTimeStr);
  const hours = minutes >= 0 ? Math.floor(minutes / 60) : 10;
  const mins = minutes >= 0 ? minutes % 60 : 0;
  const timeFormatted = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00`;

  const apptStartIso = `${cleanDate}T${timeFormatted}+08:00`;
  const apptStart = new Date(apptStartIso);

  const deadlineB = !isNaN(apptStart.getTime())
    ? new Date(apptStart.getTime() - 2 * 3600 * 1000)
    : deadlineA;

  const effectiveDeadlineMs = Math.min(deadlineA.getTime(), deadlineB.getTime());
  const finalMs = Math.max(now.getTime() + 15 * 60 * 1000, effectiveDeadlineMs);

  return new Date(finalMs).toISOString();
}

/**
 * Authoritative evaluation of Downpayment Rules for any set of services, time, and settings.
 */
export function evaluateDownpaymentRules(
  services: ServiceForDownpayment[],
  appointmentTime: string,
  appointmentDate: string = new Date().toISOString().split("T")[0],
  settings: DownpaymentRulesSettings = DEFAULT_DOWNPAYMENT_SETTINGS,
  now: Date = new Date()
): DownpaymentEvaluationResult {
  const isEnabled = settings.is_enabled !== false;
  const percentage = Math.max(1, Math.min(100, Number(settings.downpayment_percentage) || 50));
  const holdHours = Math.max(1, Number(settings.hold_time_hours) || 24);

  const totalServicePrice = (services || []).reduce(
    (sum, s) => sum + Math.max(0, Number(s.price) || 0),
    0
  );

  if (totalServicePrice <= 0) {
    return {
      required: false,
      reasons: ["Booking total is ₱0 — flagged for staff to determine price."],
      percentage,
      totalServicePrice: 0,
      downpaymentAmount: 0,
      downpaymentStatus: "Not Required",
      holdUntil: null,
      pricingFlag: "Needs Staff Pricing",
      ruleATriggered: false,
      ruleBTriggered: false,
    };
  }

  if (!isEnabled) {
    return {
      required: false,
      reasons: [],
      percentage,
      totalServicePrice,
      downpaymentAmount: 0,
      downpaymentStatus: "Not Required",
      holdUntil: null,
      pricingFlag: null,
      ruleATriggered: false,
      ruleBTriggered: false,
    };
  }

  const hairCats = new Set((settings.category_mappings?.hair_categories || []).map((c) => c.toLowerCase().trim()));
  const makeupCats = new Set((settings.category_mappings?.makeup_categories || []).map((c) => c.toLowerCase().trim()));
  const nailCats = new Set((settings.category_mappings?.nail_categories || []).map((c) => c.toLowerCase().trim()));

  let hasHair = false;
  let hasMakeup = false;
  let hasNail = false;

  for (const s of services || []) {
    const cat = (s.category || "").toLowerCase().trim();
    if (hairCats.has(cat)) hasHair = true;
    if (makeupCats.has(cat)) hasMakeup = true;
    if (nailCats.has(cat)) hasNail = true;
  }

  const reasons: string[] = [];
  let ruleATriggered = false;
  let ruleBTriggered = false;

  if (settings.rule_a_hair_makeup_enabled !== false && hasHair && hasMakeup) {
    ruleATriggered = true;
    reasons.push("Hair + Make-up service combination");
  }

  const apptMinutes = timeStringToMinutes(appointmentTime);
  const cutoffMinutes = timeStringToMinutes(settings.early_cutoff_time || "10:00");

  if (
    settings.rule_b_early_hair_nail_enabled !== false &&
    (hasHair || hasNail) &&
    apptMinutes >= 0 &&
    cutoffMinutes >= 0 &&
    apptMinutes < cutoffMinutes
  ) {
    ruleBTriggered = true;
    const catNames: string[] = [];
    if (hasHair) catNames.push("Hair");
    if (hasNail) catNames.push("Nail");
    reasons.push(
      `Early appointment (${appointmentTime} is before ${settings.early_cutoff_time || "10:00"}) with ${catNames.join(" & ")} service`
    );
  }

  const required = reasons.length > 0;
  const downpaymentAmount = required
    ? Math.round((totalServicePrice * percentage) / 100)
    : 0;

  const holdUntil = required
    ? calculateHoldUntil(appointmentDate, appointmentTime, holdHours, now)
    : null;

  return {
    required,
    reasons,
    percentage,
    totalServicePrice,
    downpaymentAmount,
    downpaymentStatus: required ? "Pending" : "Not Required",
    holdUntil,
    pricingFlag: null,
    ruleATriggered,
    ruleBTriggered,
  };
}

