/**
 * Customer Account Flagging / No-Show Risk System
 * Candy and Rose Salon Management Information System
 *
 * Risk Thresholds:
 *   0–1 failed appointments → Good Standing
 *   2+  failed appointments → Flagged (🚩)
 *
 * Failed appointments count:
 *   Cancelled + No-Show
 *
 * Non-failed statuses (NOT counted):
 *   Completed, Pending, Approved, Scheduled, In Progress
 */

export type CustomerRiskLevel = "Good Standing" | "Warning" | "Flagged";

export interface CustomerRiskSummary {
  customerId?: string | null;
  customerName?: string | null;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noshowAppointments: number;
  failedAppointments: number;
  riskStatus: CustomerRiskLevel;
  isFlagged: boolean;
  isWarning: boolean;
  isGoodStanding: boolean;
  flaggedDate?: string | null;
  becameFlaggedToday: boolean;
}

/**
 * Converts any ISO timestamp, Date, or date string into a YYYY-MM-DD string in Asia/Manila (UTC+8).
 */
export function toPhilippineDate(isoOrDate?: string | Date | null): string {
  if (!isoOrDate) return "";
  if (typeof isoOrDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(isoOrDate.trim())) {
    return isoOrDate.trim();
  }
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (isNaN(d.getTime())) {
    if (typeof isoOrDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(isoOrDate)) {
      return isoOrDate.substring(0, 10);
    }
    return "";
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Returns today's date formatted as YYYY-MM-DD in the Philippine timezone (Asia/Manila, UTC+8).
 */
export function getPhilippineToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Checks if an appointment status represents a Cancellation.
 */
export function isCancelledAppointment(status?: string | null): boolean {
  if (!status) return false;
  return status.trim().toLowerCase() === "cancelled";
}

/**
 * Checks if an appointment status represents a No-Show.
 * Handles both "No-Show", "no-show", and "no_show".
 */
export function isNoShowAppointment(status?: string | null): boolean {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return s === "no-show" || s === "no_show";
}

/**
 * Checks if an appointment status represents a Completed appointment.
 */
export function isCompletedAppointment(status?: string | null): boolean {
  if (!status) return false;
  return status.trim().toLowerCase() === "completed";
}

/**
 * Checks if an appointment status represents a failed appointment (Cancelled or No-Show).
 */
export function isFailedAppointment(status?: string | null): boolean {
  return isCancelledAppointment(status) || isNoShowAppointment(status);
}

/**
 * Evaluates the risk level based on the number of failed appointments.
 * Rule:
 *   0–1 failed appointments → Good Standing
 *   2+  failed appointments → Flagged (🚩)
 */
export function determineRiskLevel(failedCount: number): CustomerRiskLevel {
  const count = Math.max(0, Math.floor(Number(failedCount) || 0));
  if (count >= 2) return "Flagged";
  return "Good Standing";
}

/**
 * Computes the risk summary for a list of appointments belonging to one customer.
 * Accurately determines:
 *   1. Current risk status (Flagged if failed >= 2)
 *   2. When the customer reached the threshold (the 2nd failed appointment in chronological order)
 *   3. Whether that transition happened TODAY in Asia/Manila timezone
 */
export function calculateCustomerRisk(
  appointments: Array<{
    id?: string;
    status?: string | null;
    appointment_date?: string | null;
    created_at?: string | null;
    date?: string | null;
  }>,
  customerInfo?: { id?: string | null; name?: string | null }
): CustomerRiskSummary {
  const apts = Array.isArray(appointments) ? appointments : [];
  let totalAppointments = apts.length;
  let completedAppointments = 0;
  let cancelledAppointments = 0;
  let noshowAppointments = 0;

  const failedApts: Array<{
    id?: string;
    status?: string | null;
    appointment_date?: string | null;
    created_at?: string | null;
    date?: string | null;
  }> = [];

  for (const apt of apts) {
    if (isCompletedAppointment(apt.status)) {
      completedAppointments++;
    } else if (isCancelledAppointment(apt.status)) {
      cancelledAppointments++;
      failedApts.push(apt);
    } else if (isNoShowAppointment(apt.status)) {
      noshowAppointments++;
      failedApts.push(apt);
    }
  }

  const failedAppointments = cancelledAppointments + noshowAppointments;
  const riskStatus = determineRiskLevel(failedAppointments);
  const isFlagged = riskStatus === "Flagged";

  let flaggedDate: string | null = null;
  let becameFlaggedToday = false;

  if (isFlagged && failedApts.length >= 2) {
    // Sort failed appointments chronologically by event date / timestamp
    const getTimestamp = (a: any): number => {
      if (a.created_at) {
        const t = new Date(a.created_at).getTime();
        if (!isNaN(t)) return t;
      }
      if (a.appointment_date) {
        const t = new Date(`${a.appointment_date}T00:00:00+08:00`).getTime();
        if (!isNaN(t)) return t;
      }
      if (a.date) {
        const t = new Date(a.date).getTime();
        if (!isNaN(t)) return t;
      }
      return 0;
    };

    failedApts.sort((a, b) => getTimestamp(a) - getTimestamp(b));

    // The 2nd failed appointment is the exact point of transition into FLAGGED
    const secondFailed = failedApts[1];
    flaggedDate = toPhilippineDate(
      secondFailed.created_at || secondFailed.appointment_date || secondFailed.date
    );

    const todayStr = getPhilippineToday();
    becameFlaggedToday = Boolean(flaggedDate && flaggedDate === todayStr);
  }

  return {
    customerId: customerInfo?.id,
    customerName: customerInfo?.name,
    totalAppointments,
    completedAppointments,
    cancelledAppointments,
    noshowAppointments,
    failedAppointments,
    riskStatus,
    isFlagged,
    isWarning: riskStatus === "Warning",
    isGoodStanding: riskStatus === "Good Standing",
    flaggedDate,
    becameFlaggedToday,
  };
}

/**
 * Builds a lookup map of customer risk summaries from all appointments.
 * Keys include both `customer_id` and normalized `customer_name` for seamless matching.
 */
export function buildCustomerRiskMap(
  appointments?: Array<{
    id?: string;
    customer_id?: string | null;
    customer_name?: string | null;
    customers?: { name?: string; email?: string } | null;
    status?: string | null;
    created_at?: string | null;
    appointment_date?: string | null;
    date?: string | null;
  }> | null
): {
  byCustomerId: Map<string, CustomerRiskSummary>;
  byCustomerName: Map<string, CustomerRiskSummary>;
  flaggedCustomerIds: Set<string>;
  uniqueFlaggedCount: number;
  flaggedTodayCount: number;
} {
  const list = Array.isArray(appointments) ? appointments : [];

  // Pass 1: Correlate lowercase customer names to known customer_ids
  const nameToId = new Map<string, string>();
  for (const apt of list) {
    const custId = apt.customer_id?.trim();
    const custName = (apt.customer_name || apt.customers?.name || "").trim().toLowerCase();
    if (custId && custName && !nameToId.has(custName)) {
      nameToId.set(custName, custId);
    }
  }

  // Pass 2: Group appointment records strictly by customer
  const customerAptsMap = new Map<
    string,
    {
      id: string;
      name: string;
      appointments: Array<{
        id?: string;
        status?: string | null;
        created_at?: string | null;
        appointment_date?: string | null;
        date?: string | null;
      }>;
    }
  >();

  for (const apt of list) {
    let custId = apt.customer_id?.trim() || null;
    const custName = (apt.customer_name || apt.customers?.name || "").trim();
    const lowerName = custName.toLowerCase();

    // If customer_id is missing on a walk-in, resolve via linked name if available
    if (!custId && lowerName && nameToId.has(lowerName)) {
      custId = nameToId.get(lowerName)!;
    }

    const primaryKey = custId || (lowerName ? `name:${lowerName}` : null);
    if (!primaryKey) continue;

    if (!customerAptsMap.has(primaryKey)) {
      customerAptsMap.set(primaryKey, {
        id: custId || primaryKey,
        name: custName,
        appointments: [],
      });
    } else {
      const existing = customerAptsMap.get(primaryKey)!;
      if (!existing.name && custName) {
        existing.name = custName;
      }
    }

    customerAptsMap.get(primaryKey)!.appointments.push({
      id: apt.id,
      status: apt.status,
      created_at: apt.created_at,
      appointment_date: apt.appointment_date,
      date: apt.date,
    });
  }

  const byCustomerId = new Map<string, CustomerRiskSummary>();
  const byCustomerName = new Map<string, CustomerRiskSummary>();
  const flaggedCustomerIds = new Set<string>();
  let uniqueFlaggedCount = 0;
  let flaggedTodayCount = 0;

  for (const [key, data] of customerAptsMap.entries()) {
    const summary = calculateCustomerRisk(data.appointments, {
      id: data.id,
      name: data.name,
    });

    if (key.startsWith("name:")) {
      const plainName = key.replace("name:", "").trim().toLowerCase();
      byCustomerName.set(plainName, summary);
    } else {
      byCustomerId.set(key, summary);
      if (data.name) {
        byCustomerName.set(data.name.trim().toLowerCase(), summary);
      }
    }

    // Only customers meeting the threshold (Failed Bookings >= 2) are flagged
    if (summary.isFlagged) {
      uniqueFlaggedCount++;
      if (summary.becameFlaggedToday) {
        flaggedTodayCount++;
      }
      flaggedCustomerIds.add(key);
      if (data.id) {
        flaggedCustomerIds.add(data.id);
      }
      if (data.name) {
        const normName = data.name.trim().toLowerCase();
        flaggedCustomerIds.add(normName);
        flaggedCustomerIds.add(`name:${normName}`);
      }
    }
  }

  return {
    byCustomerId,
    byCustomerName,
    flaggedCustomerIds,
    uniqueFlaggedCount,
    flaggedTodayCount,
  };
}

/**
 * Calculates the number of unique customers with 2+ failed appointments (Flagged).
 * Can accept either an appointment array, a precomputed CustomerRiskMap object, or null/undefined.
 */
export function getUniqueFlaggedCustomerCount(
  data?:
    | Array<{
        id?: string;
        customer_id?: string | null;
        customer_name?: string | null;
        customers?: { name?: string; email?: string } | null;
        status?: string | null;
        created_at?: string | null;
        appointment_date?: string | null;
      }>
    | { uniqueFlaggedCount?: number; flaggedCustomerIds?: Set<string> }
    | null
): number {
  if (!data) return 0;
  if ("uniqueFlaggedCount" in data && typeof data.uniqueFlaggedCount === "number") {
    return data.uniqueFlaggedCount;
  }
  if (Array.isArray(data)) {
    const { uniqueFlaggedCount } = buildCustomerRiskMap(data);
    return uniqueFlaggedCount;
  }
  return 0;
}

/**
 * Calculates the number of unique customers who newly transitioned to Flagged TODAY.
 */
export function getFlaggedTodayCount(
  data?:
    | Array<{
        id?: string;
        customer_id?: string | null;
        customer_name?: string | null;
        customers?: { name?: string; email?: string } | null;
        status?: string | null;
        created_at?: string | null;
        appointment_date?: string | null;
      }>
    | { flaggedTodayCount?: number }
    | null
): number {
  if (!data) return 0;
  if ("flaggedTodayCount" in data && typeof data.flaggedTodayCount === "number") {
    return data.flaggedTodayCount;
  }
  if (Array.isArray(data)) {
    const { flaggedTodayCount } = buildCustomerRiskMap(data);
    return flaggedTodayCount;
  }
  return 0;
}
