import { createClient } from "@/lib/supabase/client";
import type { Appointment, Customer } from "@/lib/db";

export type LoyaltyRewardType = "percentage_discount" | "fixed_amount" | "free_service";
export type LoyaltyRewardStatus = "AVAILABLE" | "USED" | "EXPIRED";

export interface LoyaltyRewardSettings {
  id?: string;
  top_limit: number;
  reward_type: LoyaltyRewardType;
  reward_value: number;
  free_service_id?: string | null;
  free_service_name?: string | null;
  reward_description: string;
  validity_days: number;
  is_active: boolean;
  updated_at?: string;
}

export interface LoyaltyReward {
  id: string;
  customer_id: string;
  customer_name?: string | null;
  customer_email?: string | null;
  rank?: number;
  rank_position: number;
  total_spending?: number;
  total_spent: number;
  completed_transactions: number;
  reward_type: LoyaltyRewardType;
  reward_value: number;
  free_service_id?: string | null;
  free_service_name?: string | null;
  reward_description: string;
  ranking_period: string;
  ranking_period_label?: string | null;
  valid_from: string;
  valid_until: string;
  status: LoyaltyRewardStatus;
  redeemed_at?: string | null;
  redeemed_appointment_id?: string | null;
  redeemed_billing_id?: string | null;
  original_amount?: number | null;
  discount_amount?: number | null;
  final_amount?: number | null;
  notified_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export type LoyaltyRewardRecord = LoyaltyReward;

export interface RankedTopCustomer {
  rank: number;
  customerId: string | null;
  customer_id: string | null;
  name: string;
  customer_name: string;
  email: string | null;
  customer_email: string | null;
  phone: string | null;
  customer_phone: string | null;
  visits: number;
  completed_transactions: number;
  spentValue: number;
  total_spent: number;
  lastVisit: string | null;
  last_transaction_date: string | null;
  lastVisitTimestamp: number;
  rankingPeriod: string;
  rankingPeriodLabel: string;
  reward?: LoyaltyReward | null;
}

export const DEFAULT_LOYALTY_SETTINGS: LoyaltyRewardSettings = {
  top_limit: 5,
  reward_type: "percentage_discount",
  reward_value: 20,
  free_service_id: null,
  free_service_name: null,
  reward_description: "20% OFF",
  validity_days: 31,
  is_active: true,
};

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Returns current timestamp decomposed in Asia/Manila (UTC+8).
 * The Philippines does not observe Daylight Saving Time, so it is strictly UTC+8 year-round.
 */
export function getManilaDate(date: Date = new Date()): {
  year: number;
  monthIdx: number; // 0-11
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const partMap: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") {
      partMap[p.type] = parseInt(p.value, 10);
    }
  }
  return {
    year: partMap.year || date.getFullYear(),
    monthIdx: Math.max(0, Math.min(11, (partMap.month || 1) - 1)),
    day: partMap.day || date.getDate(),
    hours: partMap.hour === 24 ? 0 : partMap.hour || 0,
    minutes: partMap.minute || 0,
    seconds: partMap.second || 0,
  };
}

/**
 * Returns the PREVIOUS completed calendar month in Asia/Manila.
 * e.g., on Nov 12, 2026 -> returns { year: 2026, monthIdx: 9, rankingPeriod: "2026-10", rankingPeriodLabel: "October 2026" }
 */
export function getPreviousCompletedMonthManila(now: Date = new Date()): {
  year: number;
  monthIdx: number;
  rankingPeriod: string;
  rankingPeriodLabel: string;
} {
  const manila = getManilaDate(now);
  let prevYear = manila.year;
  let prevMonthIdx = manila.monthIdx - 1;
  if (prevMonthIdx < 0) {
    prevMonthIdx = 11;
    prevYear -= 1;
  }
  const periodMonthNum = String(prevMonthIdx + 1).padStart(2, "0");
  const rankingPeriod = `${prevYear}-${periodMonthNum}`;
  const rankingPeriodLabel = `${MONTH_NAMES[prevMonthIdx]} ${prevYear}`;
  return {
    year: prevYear,
    monthIdx: prevMonthIdx,
    rankingPeriod,
    rankingPeriodLabel,
  };
}

/**
 * Formats a reward description human-readably from settings or individual parameters.
 */
export function buildRewardDescription(
  settingsOrType: Partial<LoyaltyRewardSettings> | LoyaltyRewardType,
  rewardValue?: number,
  freeServiceName?: string | null
): string {
  const type: LoyaltyRewardType =
    typeof settingsOrType === "string"
      ? settingsOrType
      : settingsOrType.reward_type || "percentage_discount";
  const val: number =
    typeof settingsOrType === "string"
      ? Number(rewardValue) || 0
      : Number(settingsOrType.reward_value) || 0;
  const svcName: string | null | undefined =
    typeof settingsOrType === "string"
      ? freeServiceName
      : settingsOrType.free_service_name;

  if (type === "percentage_discount") {
    return `${val}% OFF`;
  }
  if (type === "fixed_amount") {
    return `₱${val.toLocaleString()} OFF`;
  }
  if (type === "free_service") {
    const svc = svcName?.trim() || "Selected Salon Service";
    return `Free ${svc}`;
  }
  if (typeof settingsOrType === "object" && settingsOrType.reward_description) {
    return settingsOrType.reward_description;
  }
  return "Loyalty Reward";
}

/**
 * Helper to return the number of days in a given (year, monthIdx 0-11) without month overflow.
 */
function getDaysInMonth(year: number, monthIdx: number): number {
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysPerMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return daysPerMonth[monthIdx] || 30;
}

/**
 * Returns the YYYY-MM ranking period key, human-readable label, ranking period start/end,
 * and following month reward start/end for a given year & monthIdx (0-11) or Date.
 * Guaranteed never to produce an Invalid Date or month 13 overflow.
 */
export function getRankingPeriodInfo(
  yearOrDate?: number | Date,
  monthIdxInput?: number
): {
  periodKey: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  rewardStartDate: string;
  rewardEndDate: string;
  validFromIso: string;
  validUntilIso: string;
  validUntilDisplay: string;
  rankingPeriod: string;
  rankingPeriodLabel: string;
  validFrom: string;
  validUntil: string;
} {
  const now = new Date();
  let safeYear = now.getFullYear();
  let safeMonth = now.getMonth();

  if (yearOrDate instanceof Date && !isNaN(yearOrDate.getTime())) {
    safeYear = yearOrDate.getFullYear();
    safeMonth = yearOrDate.getMonth();
  } else {
    const parsedYear = Number(yearOrDate);
    const parsedMonth = Number(monthIdxInput);
    if (Number.isFinite(parsedYear) && parsedYear >= 1970 && parsedYear <= 9999) {
      safeYear = Math.trunc(parsedYear);
    }
    if (Number.isFinite(parsedMonth)) {
      safeMonth = ((Math.trunc(parsedMonth) % 12) + 12) % 12;
    }
  }

  const periodMonthNum = String(safeMonth + 1).padStart(2, "0");
  const periodDays = getDaysInMonth(safeYear, safeMonth);
  const periodKey = `${safeYear}-${periodMonthNum}`;
  const periodLabel = `${MONTH_NAMES[safeMonth]} ${safeYear}`;

  // Explicit December -> January rollover (no month 13 calculation)
  const rewardYear = safeMonth === 11 ? safeYear + 1 : safeYear;
  const rewardMonth = safeMonth === 11 ? 0 : safeMonth + 1;
  const rewardDays = getDaysInMonth(rewardYear, rewardMonth);
  const rewardMonthNum = String(rewardMonth + 1).padStart(2, "0");

  // Single authoritative rule: reward expires at the end of the calendar month
  // following the ranking month, in the salon's timezone (Asia/Manila, UTC+8).
  const validUntilDisplay = `${MONTH_NAMES[rewardMonth]} ${rewardDays}, ${rewardYear}`;

  const periodStart = `${safeYear}-${periodMonthNum}-01T00:00:00+08:00`;
  const periodEnd = `${safeYear}-${periodMonthNum}-${String(periodDays).padStart(2, "0")}T23:59:59.999+08:00`;
  const rewardStartDate = `${rewardYear}-${rewardMonthNum}-01T00:00:00+08:00`;
  const rewardEndDate = `${rewardYear}-${rewardMonthNum}-${String(rewardDays).padStart(2, "0")}T23:59:59.999+08:00`;

  const validFromIso = new Date(rewardStartDate).toISOString();
  const validUntilIso = new Date(rewardEndDate).toISOString();

  return {
    periodKey,
    periodLabel,
    periodStart,
    periodEnd,
    rewardStartDate,
    rewardEndDate,
    validFromIso,
    validUntilIso,
    validUntilDisplay,
    rankingPeriod: periodKey,
    rankingPeriodLabel: periodLabel,
    validFrom: validFromIso,
    validUntil: validUntilIso,
  };
}

/**
 * Checks whether a reward has passed its valid_until timestamp.
 */
export function isRewardExpired(
  reward: Pick<LoyaltyReward, "valid_until" | "status">,
  now: Date = new Date()
): boolean {
  if (reward.status === "USED") return false;
  if (reward.status === "EXPIRED") return true;
  if (!reward.valid_until) return false;
  const expiry = new Date(reward.valid_until);
  if (isNaN(expiry.getTime())) return false;
  return now.getTime() > expiry.getTime();
}

/**
 * Computes the Top 5 Customers for a specific month and year using the exact same
 * completed/paid appointment and billing revenue data as TopCustomersList, with a deterministic
 * tie-breaking rule:
 *   1. Total completed/paid spending (descending)
 *   2. Number of completed transactions / visits (descending)
 *   3. Most recent completed transaction timestamp (descending)
 *   4. Customer name alphabetical (ascending)
 */
export function computeMonthlyTop5Customers(
  appointments: any[],
  billsOrCustomers: any[],
  customersOrYear: any[] | number,
  yearOrMonthIdx: number,
  monthIdxOrTopLimit?: number,
  topLimitInput: number = 5
): RankedTopCustomer[] {
  let bills: any[] = [];
  let customers: any[] = [];
  let year: number;
  let monthIdx: number;
  let topLimit: number;

  if (typeof customersOrYear === "number") {
    // 5-arg call: (appointments, customers, year, monthIdx, topLimit)
    bills = [];
    customers = Array.isArray(billsOrCustomers) ? billsOrCustomers : [];
    year = customersOrYear;
    monthIdx = yearOrMonthIdx;
    topLimit = typeof monthIdxOrTopLimit === "number" ? monthIdxOrTopLimit : 5;
  } else {
    // 6-arg call: (appointments, bills, customers, year, monthIdx, topLimit)
    bills = Array.isArray(billsOrCustomers) ? billsOrCustomers : [];
    customers = Array.isArray(customersOrYear) ? customersOrYear : [];
    year = yearOrMonthIdx;
    monthIdx = typeof monthIdxOrTopLimit === "number" ? monthIdxOrTopLimit : new Date().getMonth();
    topLimit = topLimitInput || 5;
  }

  const { periodKey, periodLabel } = getRankingPeriodInfo(year, monthIdx);

  // Build lookup maps for registered customers by ID and normalized name
  const customerById = new Map<string, Customer>();
  const customerByName = new Map<string, Customer>();

  (customers || []).forEach((c) => {
    if (c.id) customerById.set(c.id, c);
    if (c.name) customerByName.set(c.name.trim().toLowerCase(), c);
  });

  // Map paid billing records by appointment_id
  const paidBillByApptId = new Map<string, any>();
  (bills || []).forEach((b) => {
    const statusLower = String(b?.status || "").toLowerCase();
    if (
      b?.appointment_id &&
      statusLower !== "cancelled" &&
      statusLower !== "failed" &&
      statusLower !== "refunded" &&
      statusLower !== "pending"
    ) {
      paidBillByApptId.set(b.appointment_id, b);
    }
  });

  // Filter valid completed/paid appointments in the target month & year
  const filteredApps = (appointments || []).filter((apt) => {
    if (!apt || apt.status !== "Completed") return false;
    const payStatus = String(apt.payment_status || "").toLowerCase();
    if (payStatus === "cancelled" || payStatus === "refunded" || payStatus === "failed") {
      return false;
    }
    if (!apt.appointment_date) return false;
    const d = new Date(apt.appointment_date);
    if (isNaN(d.getTime())) return false;
    // Group according to Asia/Manila calendar month & year
    const manilaAppt = getManilaDate(d);
    return manilaAppt.monthIdx === monthIdx && manilaAppt.year === year;
  });

  const customerMap = new Map<
    string,
    {
      customerId: string | null;
      name: string;
      email: string | null;
      phone: string | null;
      visits: number;
      spentValue: number;
      lastVisit: string | null;
      lastVisitTimestamp: number;
    }
  >();

  filteredApps.forEach((app) => {
    const matchedBill = app.id ? paidBillByApptId.get(app.id) : null;
    // Count full service total (original amount before discounts/loyalty deductions, including downpayment)
    const rawPrice =
      matchedBill?.original_amount ??
      matchedBill?.subtotal ??
      matchedBill?.amount ??
      app.original_amount ??
      app.price ??
      app.services?.price ??
      0;
    const price = Math.max(0, Number(rawPrice) || 0);

    const matchedCustById = app.customer_id ? customerById.get(app.customer_id) : null;
    const rawName = (
      app.customers?.name ||
      app.customer_name ||
      matchedCustById?.name ||
      ""
    ).trim();
    if (!rawName) return;

    const matchedCust =
      matchedCustById || customerByName.get(rawName.toLowerCase()) || null;

    const resolvedId = matchedCust?.id || app.customer_id || null;
    const groupKey = resolvedId ? `id:${resolvedId}` : `name:${rawName.toLowerCase()}`;

    const existing = customerMap.get(groupKey) || {
      customerId: resolvedId,
      name: matchedCust?.name || rawName,
      email: matchedCust?.email || app.customers?.email || null,
      phone: matchedCust?.phone || app.customers?.phone || app.phone || null,
      visits: 0,
      spentValue: 0,
      lastVisit: null,
      lastVisitTimestamp: 0,
    };

    existing.visits += 1;
    existing.spentValue += price;

    const visitTs = new Date(app.appointment_date).getTime();
    if (!existing.lastVisit || visitTs > existing.lastVisitTimestamp) {
      existing.lastVisit = app.appointment_date;
      existing.lastVisitTimestamp = isNaN(visitTs) ? 0 : visitTs;
    }

    customerMap.set(groupKey, existing);
  });

  const sorted = Array.from(customerMap.values())
    .filter((c) => c.visits > 0)
    .sort((a, b) => {
      // 1. Primary: Total spending descending
      if (b.spentValue !== a.spentValue) return b.spentValue - a.spentValue;
      // 2. Secondary: Number of completed visits descending
      if (b.visits !== a.visits) return b.visits - a.visits;
      // 3. Tertiary: Most recent completed transaction descending
      if (b.lastVisitTimestamp !== a.lastVisitTimestamp) {
        return b.lastVisitTimestamp - a.lastVisitTimestamp;
      }
      // 4. Deterministic fallback: Name A-Z
      return a.name.localeCompare(b.name);
    })
    .slice(0, Math.max(1, Math.min(5, topLimit || 5)));

  return sorted.map((item, idx) => ({
    rank: idx + 1,
    customerId: item.customerId,
    customer_id: item.customerId,
    name: item.name,
    customer_name: item.name,
    email: item.email,
    customer_email: item.email,
    phone: item.phone,
    customer_phone: item.phone,
    visits: item.visits,
    completed_transactions: item.visits,
    spentValue: item.spentValue,
    total_spent: item.spentValue,
    lastVisit: item.lastVisit,
    last_transaction_date: item.lastVisit,
    lastVisitTimestamp: item.lastVisitTimestamp,
    rankingPeriod: periodKey,
    rankingPeriodLabel: periodLabel,
  }));
}

/**
 * Authoritative discount calculation for a loyalty reward applied to a set of appointments/services.
 * Supports:
 * - percentage_discount
 * - fixed_amount
 * - free_service
 */
export function calculateLoyaltyDiscountForAppointments(
  appointmentsToPay: Array<{
    id?: string;
    service_id?: string | null;
    service_name?: string | null;
    price?: number | null;
    services?: { name?: string; price?: number } | null;
  }>,
  reward: Pick<
    LoyaltyReward,
    | "reward_type"
    | "reward_value"
    | "free_service_id"
    | "free_service_name"
    | "reward_description"
    | "status"
    | "valid_until"
  > | null,
  now: Date = new Date()
): {
  isEligible: boolean;
  isApplicable: boolean;
  reason?: string;
  originalSubtotal: number;
  discountAmount: number;
  finalTotal: number;
  appliedDescription: string;
} {
  const originalSubtotal = (appointmentsToPay || []).reduce(
    (sum, a) => sum + (Number(a.price ?? a.services?.price) || 0),
    0
  );

  if (!reward) {
    return {
      isEligible: false,
      isApplicable: false,
      reason: "No reward selected.",
      originalSubtotal,
      discountAmount: 0,
      finalTotal: originalSubtotal,
      appliedDescription: "",
    };
  }

  if (reward.status !== "AVAILABLE") {
    return {
      isEligible: false,
      isApplicable: false,
      reason: `Reward is ${reward.status}.`,
      originalSubtotal,
      discountAmount: 0,
      finalTotal: originalSubtotal,
      appliedDescription: reward.reward_description,
    };
  }

  if (isRewardExpired(reward, now)) {
    return {
      isEligible: false,
      isApplicable: false,
      reason: "Reward has expired.",
      originalSubtotal,
      discountAmount: 0,
      finalTotal: originalSubtotal,
      appliedDescription: reward.reward_description,
    };
  }

  if (originalSubtotal <= 0) {
    return {
      isEligible: false,
      isApplicable: false,
      reason: "Transaction subtotal must be greater than ₱0.",
      originalSubtotal: 0,
      discountAmount: 0,
      finalTotal: 0,
      appliedDescription: reward.reward_description,
    };
  }

  let discountAmount = 0;

  if (reward.reward_type === "percentage_discount") {
    const pct = Math.max(0, Math.min(100, Number(reward.reward_value) || 0));
    discountAmount = Math.round((originalSubtotal * pct) / 100);
  } else if (reward.reward_type === "fixed_amount") {
    const fixed = Math.max(0, Number(reward.reward_value) || 0);
    discountAmount = Math.min(originalSubtotal, fixed);
  } else if (reward.reward_type === "free_service") {
    const targetServiceId = reward.free_service_id ? String(reward.free_service_id) : "";
    const targetServiceName = (reward.free_service_name || "").trim().toLowerCase();

    // Find matching service in the customer's selected appointments
    const matchedApt = (appointmentsToPay || []).find((a) => {
      if (targetServiceId && a.service_id && String(a.service_id) === targetServiceId) {
        return true;
      }
      const svcName = String(a.services?.name || a.service_name || "").trim().toLowerCase();
      if (targetServiceName && svcName) {
        return svcName.includes(targetServiceName) || targetServiceName.includes(svcName);
      }
      return false;
    });

    if (matchedApt) {
      const matchedPrice = Number(matchedApt.price ?? matchedApt.services?.price) || 0;
      discountAmount = Math.min(originalSubtotal, matchedPrice);
    } else {
      return {
        isEligible: false,
        isApplicable: false,
        reason: `Select "${reward.free_service_name || "the eligible service"}" to apply this Free Service reward.`,
        originalSubtotal,
        discountAmount: 0,
        finalTotal: originalSubtotal,
        appliedDescription: reward.reward_description,
      };
    }
  }

  discountAmount = Math.max(0, Math.min(originalSubtotal, Math.round(discountAmount)));
  const finalTotal = Math.max(0, Math.round(originalSubtotal - discountAmount));
  const isOk = discountAmount > 0;

  return {
    isEligible: isOk,
    isApplicable: isOk,
    originalSubtotal,
    discountAmount,
    finalTotal,
    appliedDescription: reward.reward_description || buildRewardDescription(reward),
  };
}

// ─── Client / DB Operations for Loyalty System ───────────────────────────────

export const LoyaltyDB = {
  async getSettings(): Promise<LoyaltyRewardSettings> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("loyalty_reward_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        top_limit: Number(data.top_limit) || 5,
        reward_type: (data.reward_type as LoyaltyRewardType) || "percentage_discount",
        reward_value: Number(data.reward_value) ?? 20,
        free_service_id: data.free_service_id || null,
        free_service_name: data.free_service_name || null,
        reward_description: data.reward_description || buildRewardDescription(data),
        validity_days: Number(data.validity_days) || 31,
        is_active: data.is_active !== false,
        updated_at: data.updated_at,
      };
    }

    return DEFAULT_LOYALTY_SETTINGS;
  },

  async saveSettings(payload: Partial<LoyaltyRewardSettings>): Promise<LoyaltyRewardSettings> {
    const supabase = createClient();
    const current = await this.getSettings();
    const merged: LoyaltyRewardSettings = {
      ...current,
      ...payload,
      top_limit: 5,
    };
    merged.reward_description = buildRewardDescription(merged);

    const dbPayload: any = {
      top_limit: merged.top_limit,
      reward_type: merged.reward_type,
      reward_value: Number(merged.reward_value) || 0,
      free_service_id: merged.free_service_id || null,
      free_service_name: merged.free_service_name || null,
      reward_description: merged.reward_description,
      validity_days: Number(merged.validity_days) || 31,
      is_active: merged.is_active !== false,
      updated_at: new Date().toISOString(),
    };

    if (current.id) {
      const { data, error } = await supabase
        .from("loyalty_reward_settings")
        .update(dbPayload)
        .eq("id", current.id)
        .select()
        .single();
      if (error) throw error;
      return data as LoyaltyRewardSettings;
    } else {
      const { data, error } = await supabase
        .from("loyalty_reward_settings")
        .insert(dbPayload)
        .select()
        .single();
      if (error) throw error;
      return data as LoyaltyRewardSettings;
    }
  },

  /**
   * Automatically expires any AVAILABLE rewards whose valid_until has passed.
   */
  async expireOutdatedRewards(): Promise<void> {
    try {
      const supabase = createClient();
      const nowIso = new Date().toISOString();
      await supabase
        .from("loyalty_rewards")
        .update({ status: "EXPIRED" })
        .eq("status", "AVAILABLE")
        .lt("valid_until", nowIso);
    } catch (e) {
      console.warn("Could not auto-expire outdated loyalty rewards:", e);
    }
  },

  /**
   * Lists all rewards for a specific customer (sorted newest first), auto-updating expired status.
   */
  async getCustomerRewards(
    customerId?: string | null,
    customerName?: string | null
  ): Promise<LoyaltyReward[]> {
    await this.expireOutdatedRewards();
    const supabase = createClient();

    let resolvedId = customerId || null;
    if (!resolvedId && customerName) {
      const { data: cust } = await supabase
        .from("customers")
        .select("id")
        .ilike("name", customerName.trim())
        .limit(1)
        .maybeSingle();
      if (cust?.id) resolvedId = cust.id;
    }

    const orParts: string[] = [];
    if (resolvedId) orParts.push(`customer_id.eq.${resolvedId}`);
    if (customerName && customerName.trim()) {
      orParts.push(`customer_name.ilike.${customerName.trim()}`);
    }

    if (orParts.length === 0) return [];

    const { data, error } = await supabase
      .from("loyalty_rewards")
      .select("*")
      .or(orParts.join(","))
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    const now = new Date();
    return (data as LoyaltyReward[]).map((r) => {
      if (r.status === "AVAILABLE" && isRewardExpired(r, now)) {
        return { ...r, status: "EXPIRED" };
      }
      return r;
    });
  },

  /**
   * Returns the customer's currently active AVAILABLE reward (if any and within validity period).
   */
  async getAvailableCustomerReward(
    customerId?: string | null,
    customerName?: string | null
  ): Promise<LoyaltyReward | null> {
    const rewards = await this.getCustomerRewards(customerId, customerName);
    const now = new Date();
    return (
      rewards.find(
        (r) =>
          r.status === "AVAILABLE" &&
          !isRewardExpired(r, now) &&
          new Date(r.valid_from).getTime() <= now.getTime()
      ) || null
    );
  },

  /**
   * Synchronizes the Top 5 Customers for a given month & year with `public.loyalty_rewards`
   * via the authoritative `/api/loyalty/sync` endpoint (with client fallback).
   */
  async syncTop5ForMonth(
    year: number,
    monthIdx: number
  ): Promise<{ top5: RankedTopCustomer[]; rewards: LoyaltyRewardRecord[] }> {
    try {
      const res = await fetch("/api/loyalty/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, monthIdx }),
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.top5)) {
          return {
            top5: json.top5 as RankedTopCustomer[],
            rewards: (json.rewards || []) as LoyaltyRewardRecord[],
          };
        }
      }
    } catch (e) {
      console.warn("Fallback to local Top 5 computation:", e);
    }

    const supabase = createClient();
    const [{ data: appts }, { data: bills }, { data: custs }] = await Promise.all([
      supabase
        .from("appointments")
        .select("*, customers(name, email, phone), services(name, price)"),
      supabase.from("billing").select("*"),
      supabase.from("customers").select("*"),
    ]);
    const top5 = computeMonthlyTop5Customers(
      (appts || []) as any,
      (bills || []) as any,
      (custs || []) as any,
      year,
      monthIdx,
      5
    );
    return { top5, rewards: [] };
  },

  /**
   * Finalizes the PREVIOUS completed calendar month in Asia/Manila idempotently.
   * Safe to call from client on-page sync (Billing, Analytics, Settings) without secret.
   */
  async syncPreviousMonth(): Promise<{
    top5: RankedTopCustomer[];
    rewards: LoyaltyRewardRecord[];
  }> {
    const prev = getPreviousCompletedMonthManila();
    return this.syncTop5ForMonth(prev.year, prev.monthIdx);
  },

  /**
   * Fetches the latest loyalty sync log entry for admin status display.
   */
  async getLatestSyncLog(): Promise<{
    id: string;
    ranking_period: string;
    ranking_period_label?: string | null;
    triggered_by: string;
    winners_created: number;
    winners_skipped: number;
    rewards_expired: number;
    zero_price_services_count: number;
    status: string;
    created_at: string;
  } | null> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("loyalty_sync_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return data as any;
      }
      return null;
    } catch {
      return null;
    }
  },
};
