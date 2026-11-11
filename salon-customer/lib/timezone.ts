/**
 * Timezone and Date-Time Validation Utilities
 * Ensures dynamic real-time validation consistent with the customer's local timezone (defaults to Asia/Manila, UTC+8).
 */

export const DEFAULT_SALON_TIMEZONE = 'Asia/Manila';

/**
 * Automatically detect customer's browser timezone with fallback to Asia/Manila
 */
export function getCustomerTimezone(): string {
  if (typeof window !== 'undefined') {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) return tz;
    } catch (_) {}
  }
  return DEFAULT_SALON_TIMEZONE;
}

export interface TimezoneNow {
  year: number;
  monthIndex: number; // 0-11 for Date compatibility
  day: number;
  hours24: number;
  minutes: number;
  seconds: number;
  dateStr: string; // YYYY-MM-DD
  timeMinutes: number; // minutes from midnight (0-1439)
}

/**
 * Returns the current date and time components in the specified timezone
 */
export function getNowInTimezone(timeZone: string = getCustomerTimezone()): TimezoneNow {
  const now = new Date();
  const safeTz = timeZone || DEFAULT_SALON_TIMEZONE;

  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: safeTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: DEFAULT_SALON_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  const parts = formatter.formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const year = parseInt(map.year, 10);
  const month = parseInt(map.month, 10);
  const day = parseInt(map.day, 10);
  const hours24 = parseInt(map.hour, 10) % 24;
  const minutes = parseInt(map.minute, 10);
  const seconds = parseInt(map.second, 10);

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeMinutes = hours24 * 60 + minutes;

  return {
    year,
    monthIndex: month - 1,
    day,
    hours24,
    minutes,
    seconds,
    dateStr,
    timeMinutes,
  };
}

/**
 * Parses a 12-hour or 24-hour time string into minutes from midnight.
 * e.g. "09:00 AM" -> 540, "01:30 PM" -> 810, "02:00 PM" -> 840
 */
export function parseSlotToMinutes(timeStr: string): number {
  if (!timeStr) return -1;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return -1;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Determines whether a given time slot on a specific date is in the past
 * based on the customer's current local timezone.
 */
export function isTimeSlotInPast(
  slot: string,
  selectedDate: string,
  timeZone: string = getCustomerTimezone()
): boolean {
  if (!selectedDate || !slot) return false;

  const current = getNowInTimezone(timeZone);

  // If the date is earlier than today in this timezone, it is in the past
  if (selectedDate < current.dateStr) {
    return true;
  }

  // If the date is in the future, the time slot is NOT in the past
  if (selectedDate > current.dateStr) {
    return false;
  }

  // Date is today: compare the slot's time to current local time
  const slotMinutes = parseSlotToMinutes(slot);
  if (slotMinutes === -1) return false;

  // The slot is in the past if slot minutes <= current time minutes
  return slotMinutes <= current.timeMinutes;
}

/**
 * Returns the first available (future) time slot from a list of slots on a selected date.
 */
export function getFirstAvailableSlot(
  slots: string[],
  selectedDate: string,
  timeZone: string = getCustomerTimezone()
): string | null {
  for (const slot of slots) {
    if (!isTimeSlotInPast(slot, selectedDate, timeZone)) {
      return slot;
    }
  }
  return null;
}

