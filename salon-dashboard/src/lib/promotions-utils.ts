/**
 * Utility functions for promotions date alignment and validation in Asia/Manila timezone.
 */

export interface ManilaDateInfo {
  year: number;
  month: number; // 1-12
  day: number;
  dateStr: string; // "YYYY-MM-DD" e.g. "2026-10-16"
  monthStr: string; // "YYYY-MM" e.g. "2026-10"
  formattedMonthYear: string; // "October 2026"
}

/**
 * Returns current date and time components in the Philippines (Asia/Manila).
 */
export function getManilaToday(): ManilaDateInfo {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(now); // "YYYY-MM-DD"
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  const monthName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    month: 'long',
  }).format(now);

  return {
    year,
    month,
    day,
    dateStr,
    monthStr: `${yearStr}-${monthStr}`,
    formattedMonthYear: `${monthName} ${yearStr}`,
  };
}

/**
 * Formats a YYYY-MM or YYYY-MM-DD string into "Month Year" (e.g. "October 2026")
 * without any browser timezone shifts or UTC drift.
 */
export function formatMonthYear(dateString: string | null | undefined): string {
  if (!dateString) return 'Not set';
  const match = dateString.match(/^(\d{4})-(\d{2})/);
  if (!match) return 'Not set';
  const year = parseInt(match[1], 10);
  const monthIndex = parseInt(match[2], 10) - 1;
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  if (monthIndex < 0 || monthIndex > 11) return 'Not set';
  return `${monthNames[monthIndex]} ${year}`;
}

/**
 * Resolves the start and end dates (YYYY-MM-DD) and month (YYYY-MM) for a promotion.
 * Handles existing start_date and end_date, as well as date (YYYY-MM-DD or YYYY-MM).
 */
export function getPromotionDateRange(promo: {
  start_date?: string | null;
  end_date?: string | null;
  date?: string | null;
}): { startDate: string | null; endDate: string | null; monthStr: string | null } {
  // If start_date and end_date are explicitly provided
  if (promo.start_date && promo.end_date) {
    const s = promo.start_date.substring(0, 10);
    const e = promo.end_date.substring(0, 10);
    const m = s.substring(0, 7);
    return { startDate: s, endDate: e, monthStr: m };
  }

  const baseDate = promo.start_date || promo.date;
  if (!baseDate) {
    return { startDate: null, endDate: null, monthStr: null };
  }

  const match = baseDate.match(/^(\d{4})-(\d{2})/);
  if (!match) {
    return { startDate: null, endDate: null, monthStr: null };
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10); // 1-12
  const monthStr = `${match[1]}-${match[2]}`;

  const startDate = `${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = promo.end_date ? promo.end_date.substring(0, 10) : `${monthStr}-${String(lastDay).padStart(2, '0')}`;

  return { startDate, endDate, monthStr };
}

/**
 * Determines whether a promotion is currently valid for the current date in Asia/Manila.
 * - Active check: status must be 'Available' or 'Active'
 * - Date check: Manila current date must be >= startDate and <= endDate
 */
export function isPromotionCurrentlyValid(
  promo: {
    status?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    date?: string | null;
  },
  referenceDateStr?: string
): boolean {
  const status = (promo.status || '').trim().toLowerCase();
  if (status !== 'available' && status !== 'active') {
    return false;
  }

  const targetDate = referenceDateStr || getManilaToday().dateStr;
  const { startDate, endDate } = getPromotionDateRange(promo);

  if (!startDate || !endDate) {
    return false;
  }

  return targetDate >= startDate && targetDate <= endDate;
}

/**
 * Customer-facing check:
 * Determines whether a promotional package is assigned to the current month in Asia/Manila and is active.
 * - Status must be 'Available' or 'Active'
 * - Month must match the current month and year in Asia/Manila (e.g. "2026-10")
 * - If date range is specified, current Manila date must be within [startDate, endDate]
 */
export function isPromotionForCurrentMonth(
  promo: {
    status?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    date?: string | null;
  },
  referenceDateInfo?: ManilaDateInfo
): boolean {
  const status = (promo.status || '').trim().toLowerCase();
  if (status !== 'available' && status !== 'active') {
    return false;
  }

  const manilaDate = referenceDateInfo || getManilaToday();
  const { startDate, endDate, monthStr } = getPromotionDateRange(promo);

  if (!monthStr || !startDate || !endDate) {
    return false;
  }

  // Must match current month in Asia/Manila
  if (monthStr !== manilaDate.monthStr) {
    return false;
  }

  return manilaDate.dateStr >= startDate && manilaDate.dateStr <= endDate;
}

/**
 * Determines whether a promotion falls in a given month (YYYY-MM).
 * Used for monthly organization in salon-dashboard.
 */
export function isPromotionInMonth(
  promo: {
    start_date?: string | null;
    end_date?: string | null;
    date?: string | null;
  },
  targetMonthStr: string
): boolean {
  if (!targetMonthStr || targetMonthStr === 'ALL') return true;

  if (targetMonthStr === 'UNASSIGNED') {
    return !promo.date && !promo.start_date;
  }

  const { monthStr, startDate, endDate } = getPromotionDateRange(promo);
  if (!startDate || !endDate) return false;

  if (monthStr === targetMonthStr) return true;

  const match = targetMonthStr.match(/^(\d{4})-(\d{2})/);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const monthStart = `${targetMonthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${targetMonthStr}-${String(lastDay).padStart(2, '0')}`;

  return startDate <= monthEnd && endDate >= monthStart;
}
