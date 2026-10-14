/**
 * Revenue forecasting engine for the Salon Dashboard.
 *
 * This module is intentionally pure and dependency-free (no Supabase / React
 * imports) so it can run inside API route handlers and be unit-tested with
 * Node's built-in test runner (`node --test scripts/test-revenue-forecast.mjs`).
 *
 * Revenue definitions used throughout:
 *  - Actual collected revenue: `billing` rows with status "Paid" (one per
 *    appointment, latest wins) that are not linked to a cancelled appointment,
 *    plus "Completed" appointments that have no paid billing row (fallback to
 *    the appointment's listed price, flagged in data-quality notes).
 *  - Expected revenue from appointments: confirmed ("Scheduled" / "In Progress")
 *    appointments from today onward that have not been paid yet, weighted by
 *    the historical show-up rate and the discount/price realisation rate.
 *  - Projected revenue: per period, max(trend estimate, booked expectation),
 *    plus anything already collected in the current (partial) period.
 */

// ─── Configuration ──────────────────────────────────────────────────────────

/** The salon operates in the Philippines; all dates are bucketed in this zone. */
export const SALON_TIMEZONE = "Asia/Manila";
/** Fixed UTC offset for Asia/Manila (no daylight-saving time). */
export const SALON_UTC_OFFSET = "+08:00";

export type Granularity = "daily" | "weekly" | "monthly";
export const GRANULARITIES: readonly Granularity[] = ["daily", "weekly", "monthly"];

interface GranularityConfig {
  /** Number of periods forecast, starting with the current period. */
  horizon: number;
  /** Default number of historical periods shown. */
  defaultHistory: number;
  /** Maximum number of historical periods a user may request. */
  maxHistory: number;
  /** Number of complete periods used to train the model. */
  lookback: number;
  /** Window used by the weighted moving average. */
  wmaWindow: number;
  /** Minimum complete periods before the damped Holt trend model is used. */
  holtMin: number;
  /** Minimum complete days before day-of-week factors are applied (daily only). */
  seasonalMin: number;
  unit: string;
  horizonLabel: string;
}

export const FORECAST_CONFIG: Record<Granularity, GranularityConfig> = {
  daily: {
    horizon: 7, defaultHistory: 30, maxHistory: 180, lookback: 120,
    wmaWindow: 14, holtMin: 28, seasonalMin: 21,
    unit: "day", horizonLabel: "Next 7 days (incl. today)",
  },
  weekly: {
    horizon: 4, defaultHistory: 12, maxHistory: 104, lookback: 52,
    wmaWindow: 6, holtMin: 12, seasonalMin: Number.POSITIVE_INFINITY,
    unit: "week", horizonLabel: "This week + next 3 weeks",
  },
  monthly: {
    horizon: 3, defaultHistory: 12, maxHistory: 60, lookback: 24,
    wmaWindow: 6, holtMin: 12, seasonalMin: Number.POSITIVE_INFINITY,
    unit: "month", horizonLabel: "This month + next 2 months",
  },
};

/** Default cancellation/no-show rate blended in when there are few appointments. */
export const CANCELLATION_PRIOR_RATE = 0.15;
/** Weight (in pseudo-appointments) given to the prior rate. */
export const CANCELLATION_PRIOR_WEIGHT = 10;
/** Days of appointment history used for the cancellation rate. */
export const CANCELLATION_WINDOW_DAYS = 180;
/** Minimum training periods before a period is back-tested. */
export const BACKTEST_MIN_TRAIN = 2;

const HOLT_ALPHA = 0.4;
const HOLT_BETA = 0.2;
const HOLT_PHI = 0.9;
/** z-score for an ~80% prediction interval. */
const INTERVAL_Z = 1.28;

// ─── Raw record types (subset of Supabase columns) ──────────────────────────

export interface RawAppointment {
  id: string;
  appointment_date: string | null;
  appointment_time?: string | null;
  status: string | null;
  price: number | string | null;
  service_name?: string | null;
  customer_name?: string | null;
  staff_name?: string | null;
  services?: { name?: string | null; price?: number | string | null } | null;
}

export interface RawBilling {
  id: string;
  appointment_id: string | null;
  amount: number | string | null;
  status: string | null;
  created_at: string;
}

// ─── Date helpers (calendar dates as "YYYY-MM-DD" keys) ─────────────────────

const DAY_MS = 86_400_000;
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function isValidDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_KEY_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Accepts "YYYY-MM-DD" or an ISO date-time prefix; returns a date key or null. */
export function normalizeDateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const key = String(value).slice(0, 10);
  return isValidDateKey(key) ? key : null;
}

function toUtcMs(key: string): number {
  return Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)));
}

function fromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(key: string, days: number): string {
  return fromUtcMs(toUtcMs(key) + days * DAY_MS);
}

/** Whole days from `a` to `b` (b − a). */
export function diffDays(a: string, b: string): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);
}

function addMonths(key: string, months: number): string {
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7)) - 1 + months;
  return fromUtcMs(Date.UTC(y, m, 1));
}

/** Monday = 0 … Sunday = 6. */
export function dayOfWeek(key: string): number {
  return (new Date(toUtcMs(key)).getUTCDay() + 6) % 7;
}

/** Converts a timestamp to the salon-local calendar date. */
export function toLocalDateKey(input: string | Date, timeZone: string = SALON_TIMEZONE): string | null {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const key = `${get("year")}-${get("month")}-${get("day")}`;
  return isValidDateKey(key) ? key : null;
}

export function bucketStart(key: string, g: Granularity): string {
  if (g === "daily") return key;
  if (g === "weekly") return addDays(key, -dayOfWeek(key));
  return `${key.slice(0, 7)}-01`;
}

export function nextBucketStart(start: string, g: Granularity): string {
  if (g === "daily") return addDays(start, 1);
  if (g === "weekly") return addDays(start, 7);
  return addMonths(start, 1);
}

export function shiftBucket(start: string, g: Granularity, n: number): string {
  if (g === "daily") return addDays(start, n);
  if (g === "weekly") return addDays(start, 7 * n);
  return addMonths(start, n);
}

export function bucketEnd(start: string, g: Granularity): string {
  return addDays(nextBucketStart(start, g), -1);
}

export function bucketDays(start: string, g: Granularity): number {
  return diffDays(start, nextBucketStart(start, g));
}

function shortDate(key: string): string {
  return `${MONTHS[Number(key.slice(5, 7)) - 1]} ${Number(key.slice(8, 10))}`;
}

export function bucketLabel(start: string, g: Granularity): string {
  if (g === "daily") return shortDate(start);
  if (g === "monthly") return `${MONTHS[Number(start.slice(5, 7)) - 1]} ${start.slice(0, 4)}`;
  const end = bucketEnd(start, g);
  return start.slice(5, 7) === end.slice(5, 7)
    ? `${shortDate(start)}–${Number(end.slice(8, 10))}`
    : `${shortDate(start)}–${shortDate(end)}`;
}

/** Bucket starts covering [fromKey, toKey] inclusive. */
export function enumerateBuckets(fromKey: string, toKey: string, g: Granularity): string[] {
  const out: string[] = [];
  for (let s = bucketStart(fromKey, g); s <= toKey; s = nextBucketStart(s, g)) {
    out.push(s);
    if (out.length > 5000) break; // safety guard
  }
  return out;
}

// ─── Normalisation helpers ──────────────────────────────────────────────────

export type NormalizedStatus = "completed" | "cancelled" | "no_show" | "scheduled" | "in_progress" | "other";

export function normalizeStatus(status: string | null | undefined): NormalizedStatus {
  const v = (status ?? "").toLowerCase().replace(/[\s_-]+/g, "");
  if (v === "completed" || v === "done") return "completed";
  if (v === "cancelled" || v === "canceled" || v === "rejected") return "cancelled";
  if (v === "noshow") return "no_show";
  if (v === "scheduled" || v === "confirmed" || v === "approved") return "scheduled";
  if (v === "inprogress" || v === "ongoing" || v === "arrived") return "in_progress";
  return "other";
}

export function isPaidBillingStatus(status: string | null | undefined): boolean {
  return (status ?? "").trim().toLowerCase() === "paid";
}

export function toAmount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** The appointment's booked price, falling back to the catalogue service price. */
export function listedPrice(apt: RawAppointment | undefined | null): number {
  if (!apt) return 0;
  return toAmount(apt.price) || toAmount(apt.services?.price);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

// ─── Step 1: actual collected revenue ───────────────────────────────────────

export interface CollectedTransaction {
  id: string;
  date: string;
  amount: number;
  source: "billing" | "appointment";
  appointmentId: string | null;
}

export interface DataQuality {
  paidBillingRecords: number;
  duplicateBillingIgnored: number;
  billingOnCancelledExcluded: number;
  completedWithoutBilling: number;
  completedWithoutBillingAmount: number;
  completedWithoutPrice: number;
  invalidDates: number;
  upcomingWithoutPrice: number;
}

export interface CollectedResult {
  transactions: CollectedTransaction[];
  /** Appointment IDs that already have collected revenue (never re-counted as projected). */
  paidAppointmentIds: Set<string>;
  /** Paid billing amount per appointment, used for the discount realisation rate. */
  billedByAppointment: Map<string, number>;
  quality: DataQuality;
}

export function emptyDataQuality(): DataQuality {
  return {
    paidBillingRecords: 0, duplicateBillingIgnored: 0, billingOnCancelledExcluded: 0,
    completedWithoutBilling: 0, completedWithoutBillingAmount: 0, completedWithoutPrice: 0,
    invalidDates: 0, upcomingWithoutPrice: 0,
  };
}

export function buildCollectedTransactions(
  appointments: RawAppointment[],
  billings: RawBilling[],
  timeZone: string = SALON_TIMEZONE,
): CollectedResult {
  const quality = emptyDataQuality();
  const aptById = new Map<string, RawAppointment>();
  for (const a of appointments) if (a?.id) aptById.set(a.id, a);

  // Deduplicate: one paid billing row per appointment (latest created_at wins).
  const latestPaid = new Map<string, RawBilling>();
  const standalone: RawBilling[] = [];
  for (const b of billings) {
    if (!b || !isPaidBillingStatus(b.status) || toAmount(b.amount) <= 0) continue;
    quality.paidBillingRecords++;
    if (b.appointment_id) {
      const prev = latestPaid.get(b.appointment_id);
      if (prev) {
        quality.duplicateBillingIgnored++;
        if (String(b.created_at) > String(prev.created_at)) latestPaid.set(b.appointment_id, b);
      } else {
        latestPaid.set(b.appointment_id, b);
      }
    } else {
      standalone.push(b);
    }
  }

  const transactions: CollectedTransaction[] = [];
  const paidAppointmentIds = new Set<string>();
  const billedByAppointment = new Map<string, number>();

  for (const [aptId, b] of latestPaid) {
    const apt = aptById.get(aptId);
    const status = apt ? normalizeStatus(apt.status) : "other";
    if (status === "cancelled") {
      quality.billingOnCancelledExcluded++;
      continue;
    }
    const aptDate = apt ? normalizeDateKey(apt.appointment_date) : null;
    const billDate = toLocalDateKey(b.created_at, timeZone);
    // Completed services are attributed to the service date (matches the rest of
    // the dashboard); advance payments are attributed to the payment date.
    const date = status === "completed" && aptDate ? aptDate : (billDate ?? aptDate);
    if (!date) {
      quality.invalidDates++;
      continue;
    }
    const amount = toAmount(b.amount);
    transactions.push({ id: b.id, date, amount, source: "billing", appointmentId: aptId });
    paidAppointmentIds.add(aptId);
    billedByAppointment.set(aptId, amount);
  }

  for (const b of standalone) {
    const date = toLocalDateKey(b.created_at, timeZone);
    if (!date) {
      quality.invalidDates++;
      continue;
    }
    transactions.push({ id: b.id, date, amount: toAmount(b.amount), source: "billing", appointmentId: null });
  }

  // Completed appointments without a paid billing row: count once at listed price.
  for (const apt of appointments) {
    if (!apt?.id || normalizeStatus(apt.status) !== "completed" || latestPaid.has(apt.id)) continue;
    const amount = listedPrice(apt);
    if (amount <= 0) {
      quality.completedWithoutPrice++;
      continue;
    }
    const date = normalizeDateKey(apt.appointment_date);
    if (!date) {
      quality.invalidDates++;
      continue;
    }
    quality.completedWithoutBilling++;
    quality.completedWithoutBillingAmount += amount;
    transactions.push({ id: `apt:${apt.id}`, date, amount, source: "appointment", appointmentId: apt.id });
    paidAppointmentIds.add(apt.id);
  }

  return { transactions, paidAppointmentIds, billedByAppointment, quality };
}

// ─── Step 2: discount / price realisation rate ──────────────────────────────

export interface RealizationStats {
  rate: number;
  sampleSize: number;
  billedTotal: number;
  listedTotal: number;
}

/** Σ billed ÷ Σ listed price for paid appointments. < 1 means discounts were given. */
export function computeRealization(
  appointments: RawAppointment[],
  billedByAppointment: Map<string, number>,
): RealizationStats {
  const aptById = new Map(appointments.map((a) => [a.id, a]));
  let billedTotal = 0;
  let listedTotal = 0;
  let sampleSize = 0;
  for (const [aptId, billed] of billedByAppointment) {
    const listed = listedPrice(aptById.get(aptId));
    if (listed <= 0) continue;
    billedTotal += billed;
    listedTotal += listed;
    sampleSize++;
  }
  const rate = listedTotal > 0 ? clamp(billedTotal / listedTotal, 0.5, 1.5) : 1;
  return { rate: round2(rate * 100) / 100, sampleSize, billedTotal: round2(billedTotal), listedTotal: round2(listedTotal) };
}

// ─── Step 3: cancellation / no-show rate ────────────────────────────────────

export interface AttritionStats {
  completed: number;
  cancelled: number;
  noShow: number;
  resolved: number;
  observedRate: number | null;
  appliedRate: number;
  windowDays: number;
}

export function computeAttrition(
  appointments: RawAppointment[],
  today: string,
  windowDays: number = CANCELLATION_WINDOW_DAYS,
): AttritionStats {
  const from = addDays(today, -windowDays);
  let completed = 0;
  let cancelled = 0;
  let noShow = 0;
  for (const apt of appointments) {
    const date = normalizeDateKey(apt.appointment_date);
    if (!date || date < from) continue;
    const s = normalizeStatus(apt.status);
    if (s === "completed") completed++;
    else if (s === "cancelled") cancelled++;
    else if (s === "no_show") noShow++;
  }
  const resolved = completed + cancelled + noShow;
  const lost = cancelled + noShow;
  const observedRate = resolved > 0 ? lost / resolved : null;
  const appliedRate =
    (lost + CANCELLATION_PRIOR_RATE * CANCELLATION_PRIOR_WEIGHT) / (resolved + CANCELLATION_PRIOR_WEIGHT);
  return {
    completed, cancelled, noShow, resolved,
    observedRate: observedRate === null ? null : round2(observedRate * 10000) / 10000,
    appliedRate: round2(appliedRate * 10000) / 10000,
    windowDays,
  };
}

// ─── Step 4: upcoming confirmed appointments ────────────────────────────────

export interface UpcomingAppointment {
  id: string;
  date: string;
  time: string | null;
  customer: string;
  service: string;
  staff: string | null;
  status: "Scheduled" | "In Progress";
  listedPrice: number;
  probability: number;
  expectedValue: number;
  priceMissing: boolean;
}

export function buildUpcoming(
  appointments: RawAppointment[],
  paidAppointmentIds: Set<string>,
  today: string,
  horizonEnd: string,
  attritionRate: number,
  realizationRate: number,
  quality?: DataQuality,
): UpcomingAppointment[] {
  const out: UpcomingAppointment[] = [];
  for (const apt of appointments) {
    if (!apt?.id || paidAppointmentIds.has(apt.id)) continue;
    const s = normalizeStatus(apt.status);
    if (s !== "scheduled" && s !== "in_progress") continue;
    const date = normalizeDateKey(apt.appointment_date);
    if (!date || date < today || date > horizonEnd) continue;
    const price = listedPrice(apt);
    if (price <= 0 && quality) quality.upcomingWithoutPrice++;
    // A customer who has already arrived is assumed to complete the service.
    const probability = s === "in_progress" ? 1 : clamp(1 - attritionRate, 0, 1);
    out.push({
      id: apt.id,
      date,
      time: apt.appointment_time ?? null,
      customer: apt.customer_name || "Walk-in customer",
      service: apt.service_name || apt.services?.name || "Salon service",
      staff: apt.staff_name ?? null,
      status: s === "in_progress" ? "In Progress" : "Scheduled",
      listedPrice: round2(price),
      probability: round2(probability * 10000) / 10000,
      expectedValue: round2(price * probability * realizationRate),
      priceMissing: price <= 0,
    });
  }
  out.sort((a, b) => (a.date === b.date ? String(a.time ?? "").localeCompare(String(b.time ?? "")) : a.date.localeCompare(b.date)));
  return out;
}

// ─── Step 5: time-series forecasting ────────────────────────────────────────

export type ForecastMethod = "none" | "simple_average" | "weighted_moving_average" | "holt_damped";

export const METHOD_LABELS: Record<ForecastMethod, string> = {
  none: "Booked appointments only",
  simple_average: "Simple average",
  weighted_moving_average: "Weighted moving average",
  holt_damped: "Damped trend (Holt) smoothing",
};

export interface SeriesPoint {
  start: string;
  value: number;
}

export function selectMethod(n: number, g: Granularity): ForecastMethod {
  if (n <= 0) return "none";
  if (n < 3) return "simple_average";
  if (n < FORECAST_CONFIG[g].holtMin) return "weighted_moving_average";
  return "holt_damped";
}

/** Linear weights 1..w on the last w values (most recent weighs most). */
export function weightedMovingAverage(values: number[], window: number): number {
  const w = Math.min(window, values.length);
  if (w <= 0) return 0;
  const slice = values.slice(-w);
  let num = 0;
  let den = 0;
  slice.forEach((v, i) => {
    num += v * (i + 1);
    den += i + 1;
  });
  return num / den;
}

/** Holt's linear trend with damping; returns forecasts for 1..steps ahead. */
export function holtDamped(values: number[], steps: number): number[] {
  let level = values[0];
  const diffs: number[] = [];
  for (let i = 1; i < Math.min(values.length, 5); i++) diffs.push(values[i] - values[i - 1]);
  let trend = diffs.length ? sum(diffs) / diffs.length : 0;
  for (let i = 1; i < values.length; i++) {
    const prevLevel = level;
    level = HOLT_ALPHA * values[i] + (1 - HOLT_ALPHA) * (prevLevel + HOLT_PHI * trend);
    trend = HOLT_BETA * (level - prevLevel) + (1 - HOLT_BETA) * HOLT_PHI * trend;
  }
  const out: number[] = [];
  let damp = 0;
  for (let h = 1; h <= steps; h++) {
    damp += Math.pow(HOLT_PHI, h);
    out.push(Math.max(0, level + damp * trend));
  }
  return out;
}

/** Day-of-week multipliers (Mon..Sun), shrunk toward 1 and normalised to mean 1. */
export function dayOfWeekFactors(series: SeriesPoint[]): number[] {
  const recent = series.slice(-56);
  const mean = recent.length ? sum(recent.map((p) => p.value)) / recent.length : 0;
  if (mean <= 0) return [1, 1, 1, 1, 1, 1, 1];
  const totals = [0, 0, 0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const p of recent) {
    const d = dayOfWeek(p.start);
    totals[d] += p.value;
    counts[d]++;
  }
  const raw = totals.map((t, d) => {
    const c = counts[d];
    const ratio = c > 0 ? t / c / mean : 1;
    return (c * ratio + 2) / (c + 2); // shrink toward 1 with 2 pseudo-observations
  });
  const avg = sum(raw) / 7;
  return raw.map((f) => Math.max(0.05, f / avg));
}

export interface SeriesForecast {
  method: ForecastMethod;
  seasonal: boolean;
  /** Forecasts for the `steps` periods immediately after the last series point. */
  forecasts: number[];
}

export function forecastSeries(series: SeriesPoint[], steps: number, g: Granularity): SeriesForecast {
  const n = series.length;
  const method = selectMethod(n, g);
  if (method === "none") return { method, seasonal: false, forecasts: new Array(steps).fill(0) };

  const cfg = FORECAST_CONFIG[g];
  const seasonal = g === "daily" && n >= cfg.seasonalMin;
  const factors = seasonal ? dayOfWeekFactors(series) : null;
  const values = series.map((p) => (factors ? p.value / factors[dayOfWeek(p.start)] : p.value));

  let base: number[];
  if (method === "simple_average") {
    base = new Array(steps).fill(sum(values) / n);
  } else if (method === "weighted_moving_average") {
    base = new Array(steps).fill(weightedMovingAverage(values, cfg.wmaWindow));
  } else {
    base = holtDamped(values, steps);
  }

  let cursor = series[n - 1].start;
  const forecasts = base.map((v) => {
    cursor = nextBucketStart(cursor, g);
    const f = factors ? v * factors[dayOfWeek(cursor)] : v;
    return Math.max(0, f);
  });
  return { method, seasonal, forecasts };
}

export interface BacktestPoint {
  start: string;
  forecast: number;
  actual: number;
  method: ForecastMethod;
}

/** Rolling one-step-ahead back-test using only data available before each period. */
export function backtestSeries(series: SeriesPoint[], g: Granularity, minTrain: number = BACKTEST_MIN_TRAIN): BacktestPoint[] {
  const out: BacktestPoint[] = [];
  for (let i = Math.max(1, minTrain); i < series.length; i++) {
    const f = forecastSeries(series.slice(0, i), 1, g);
    out.push({ start: series[i].start, forecast: f.forecasts[0], actual: series[i].value, method: f.method });
  }
  return out;
}

export interface AccuracyStats {
  samples: number;
  /** Weighted absolute percentage error: Σ|F−A| ÷ ΣA (robust to zero periods). */
  wape: number | null;
  /** Σ(F−A) ÷ ΣA — positive means the model tends to over-estimate. */
  bias: number | null;
  rmse: number;
}

export function accuracyStats(points: BacktestPoint[]): AccuracyStats {
  const samples = points.length;
  if (!samples) return { samples: 0, wape: null, bias: null, rmse: 0 };
  const actualSum = sum(points.map((p) => p.actual));
  const absErr = sum(points.map((p) => Math.abs(p.forecast - p.actual)));
  const err = sum(points.map((p) => p.forecast - p.actual));
  const rmse = Math.sqrt(sum(points.map((p) => (p.forecast - p.actual) ** 2)) / samples);
  return {
    samples,
    wape: actualSum > 0 ? round2((absErr / actualSum) * 10000) / 10000 : null,
    bias: actualSum > 0 ? round2((err / actualSum) * 10000) / 10000 : null,
    rmse: round2(rmse),
  };
}

// ─── Step 6: full forecast assembly ─────────────────────────────────────────

export interface ForecastInput {
  appointments: RawAppointment[];
  billings: RawBilling[];
  granularity: Granularity;
  /** Salon-local "today" (YYYY-MM-DD). */
  today: string;
  /** Requested history range (inclusive), salon-local dates. */
  historyFrom: string;
  historyTo: string;
  /** Earliest appointment/billing date on record (salon-local), if known. */
  firstRecordDate: string | null;
  timeZone?: string;
}

export interface ForecastBucket {
  start: string;
  end: string;
  label: string;
  /** Actual collected revenue (complete periods) or collected so far (current period). */
  actual: number | null;
  /** Expected revenue from confirmed appointments (after cancellation & discount adjustment). */
  booked: number;
  /** Listed value of confirmed appointments before adjustments. */
  bookedGross: number;
  bookedCount: number;
  /** Trend-based estimate from historical revenue. */
  trend: number | null;
  /** Total projected revenue for the period (estimate). */
  projected: number | null;
  low: number | null;
  high: number | null;
  isCurrent: boolean;
  isForecast: boolean;
}

export interface ComparisonRow {
  start: string;
  end: string;
  label: string;
  forecast: number;
  actual: number;
  variance: number;
  variancePct: number | null;
  method: ForecastMethod;
}

export type ReliabilityLevel = "insufficient" | "low" | "moderate" | "good";

export interface ForecastResult {
  granularity: Granularity;
  timeZone: string;
  today: string;
  range: { from: string; to: string; requestedFrom: string; requestedTo: string };
  horizon: { from: string; to: string; periods: number; label: string; unit: string };
  history: ForecastBucket[];
  forecast: ForecastBucket[];
  summary: {
    historicalTotal: number;
    historicalAverage: number;
    historicalPeriods: number;
    historicalTransactions: number;
    projectedTotal: number;
    collectedSoFar: number;
    expectedFromAppointments: number;
    bookedGross: number;
    upcomingCount: number;
    trendTotal: number | null;
    additionalEstimated: number;
    previousPeriodTotal: number;
    previousPeriodFrom: string;
    previousPeriodTo: string;
    growthAmount: number | null;
    growthPct: number | null;
  };
  model: {
    method: ForecastMethod;
    methodLabel: string;
    seasonal: boolean;
    trainingPeriods: number;
    dataStart: string | null;
    attrition: AttritionStats;
    realization: RealizationStats;
    accuracy: AccuracyStats;
  };
  reliability: { level: ReliabilityLevel; reasons: string[] };
  upcoming: UpcomingAppointment[];
  comparison: ComparisonRow[];
  dataQuality: DataQuality;
  hasAnyData: boolean;
}

function sumTransactions(tx: CollectedTransaction[], from: string, to: string): number {
  let total = 0;
  for (const t of tx) if (t.date >= from && t.date <= to) total += t.amount;
  return total;
}

function peso(n: number): string {
  return `₱${Math.round(n).toLocaleString("en-PH")}`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function computeRevenueForecast(input: ForecastInput): ForecastResult {
  const g = input.granularity;
  const cfg = FORECAST_CONFIG[g];
  const tz = input.timeZone ?? SALON_TIMEZONE;
  const today = input.today;

  const currentStart = bucketStart(today, g);
  const lastCompleteStart = shiftBucket(currentStart, g, -1);
  const lastCompleteEnd = addDays(currentStart, -1);
  const horizonStarts = Array.from({ length: cfg.horizon }, (_, i) => shiftBucket(currentStart, g, i));
  const horizonEnd = bucketEnd(horizonStarts[horizonStarts.length - 1], g);

  // 1. Actual collected revenue (deduplicated).
  const collected = buildCollectedTransactions(input.appointments, input.billings, tz);
  const tx = collected.transactions.filter((t) => t.date <= today);
  const quality = collected.quality;

  // 2–3. Adjustment factors.
  const realization = computeRealization(input.appointments, collected.billedByAppointment);
  const attrition = computeAttrition(input.appointments, today);

  // 4. Upcoming confirmed appointments within the horizon.
  const upcoming = buildUpcoming(
    input.appointments, collected.paidAppointmentIds, today, horizonEnd,
    attrition.appliedRate, realization.rate, quality,
  );

  // 5. Training series of complete periods.
  const txDates = tx.map((t) => t.date).sort();
  const candidates = [input.firstRecordDate, txDates[0]].filter((d): d is string => !!d && isValidDateKey(d) && d <= today);
  const dataStart = candidates.length ? candidates.sort()[0] : null;

  const series: SeriesPoint[] = [];
  if (dataStart && dataStart <= lastCompleteEnd) {
    const lookbackStart = shiftBucket(currentStart, g, -cfg.lookback);
    const firstBucket = bucketStart(dataStart, g);
    const trainFrom = firstBucket > lookbackStart ? firstBucket : lookbackStart;
    for (const s of enumerateBuckets(trainFrom, lastCompleteStart, g)) {
      const e = bucketEnd(s, g);
      let value = sumTransactions(tx, s, e);
      if (dataStart > s) {
        // Records began part-way through this period: scale up, or drop if too partial.
        const total = bucketDays(s, g);
        const observed = diffDays(dataStart, e) + 1;
        if (observed / total < 0.5) continue;
        value = (value * total) / observed;
      }
      series.push({ start: s, value });
    }
  }

  const model = forecastSeries(series, cfg.horizon, g);
  const backtest = backtestSeries(series, g);
  const accuracy = accuracyStats(backtest);
  const intervalHalfWidth = accuracy.samples >= 3 ? INTERVAL_Z * accuracy.rmse : null;

  // 6. Forecast buckets.
  const forecast: ForecastBucket[] = horizonStarts.map((s, i) => {
    const e = bucketEnd(s, g);
    const isCurrent = i === 0;
    const inBucket = upcoming.filter((u) => u.date >= s && u.date <= e);
    const booked = sum(inBucket.map((u) => u.expectedValue));
    const bookedGross = sum(inBucket.map((u) => u.listedPrice));
    const trend = model.method === "none" ? null : model.forecasts[i];

    let actual: number | null = null;
    let projected: number;
    let floor = 0;
    if (isCurrent) {
      actual = sumTransactions(tx, s, today);
      const remainingDays = diffDays(today, e); // days after today
      const remainingTrend = trend === null ? 0 : (trend * remainingDays) / bucketDays(s, g);
      projected = actual + Math.max(remainingTrend, booked);
      floor = actual;
    } else {
      projected = Math.max(trend ?? 0, booked);
    }

    return {
      start: s, end: e, label: bucketLabel(s, g),
      actual: actual === null ? null : round2(actual),
      booked: round2(booked), bookedGross: round2(bookedGross), bookedCount: inBucket.length,
      trend: trend === null ? null : round2(trend),
      projected: round2(projected),
      low: intervalHalfWidth === null ? null : round2(Math.max(floor, projected - intervalHalfWidth)),
      high: intervalHalfWidth === null ? null : round2(projected + intervalHalfWidth),
      isCurrent, isForecast: true,
    };
  });

  // History buckets: whole periods inside the requested range, complete periods only.
  const rangeFrom = bucketStart(input.historyFrom, g);
  const requestedEnd = bucketEnd(bucketStart(input.historyTo, g), g);
  const rangeTo = requestedEnd < lastCompleteEnd ? requestedEnd : lastCompleteEnd;
  const historyStarts = rangeFrom <= rangeTo ? enumerateBuckets(rangeFrom, rangeTo, g) : [];
  const history: ForecastBucket[] = historyStarts.map((s) => {
    const e = bucketEnd(s, g);
    return {
      start: s, end: e, label: bucketLabel(s, g),
      actual: round2(sumTransactions(tx, s, e)),
      booked: 0, bookedGross: 0, bookedCount: 0, trend: null, projected: null, low: null, high: null,
      isCurrent: false, isForecast: false,
    };
  });

  const backtestByStart = new Map(backtest.map((b) => [b.start, b]));
  const comparison: ComparisonRow[] = history
    .filter((h) => backtestByStart.has(h.start))
    .map((h) => {
      const b = backtestByStart.get(h.start)!;
      const actual = h.actual ?? 0; // unscaled actual for the displayed period
      const variance = actual - b.forecast;
      return {
        start: h.start, end: h.end, label: h.label,
        forecast: round2(b.forecast), actual: round2(actual), variance: round2(variance),
        variancePct: b.forecast > 0 ? round2((variance / b.forecast) * 10000) / 10000 : null,
        method: b.method,
      };
    })
    .reverse();

  // Summary.
  const historicalTotal = sum(history.map((h) => h.actual ?? 0));
  const projectedTotal = sum(forecast.map((f) => f.projected ?? 0));
  const collectedSoFar = forecast[0].actual ?? 0;
  const expectedFromAppointments = sum(forecast.map((f) => f.booked));
  const bookedGross = sum(forecast.map((f) => f.bookedGross));
  const trendTotal = model.method === "none" ? null : sum(forecast.map((f) => f.trend ?? 0));
  const previousPeriodFrom = shiftBucket(currentStart, g, -cfg.horizon);
  const previousPeriodTo = lastCompleteEnd;
  const previousPeriodTotal = sumTransactions(tx, previousPeriodFrom, previousPeriodTo);
  const growthAmount = previousPeriodTotal > 0 ? projectedTotal - previousPeriodTotal : null;
  const growthPct = previousPeriodTotal > 0 ? (projectedTotal - previousPeriodTotal) / previousPeriodTotal : null;

  // Reliability assessment.
  const reasons: string[] = [];
  const n = series.length;
  const hasAnyData = tx.length > 0 || upcoming.length > 0;
  let level: ReliabilityLevel;
  if (model.method === "none") {
    level = "insufficient";
    reasons.push(
      upcoming.length
        ? `No complete ${cfg.unit} of revenue history yet, so the forecast is based only on confirmed upcoming appointments.`
        : `No complete ${cfg.unit} of revenue history and no confirmed upcoming appointments — there is nothing to base a forecast on yet.`,
    );
  } else if (model.method === "holt_damped") {
    level = "moderate";
  } else {
    level = n < 6 ? "low" : "moderate";
  }
  if (model.method !== "none" && n < cfg.holtMin) {
    reasons.push(
      `Only ${plural(n, `complete ${cfg.unit}`)} of revenue history; ${cfg.holtMin}+ are recommended for trend-based forecasting, so a ${METHOD_LABELS[model.method].toLowerCase()} was used.`,
    );
  }
  if (accuracy.wape !== null && accuracy.samples >= 3) {
    if (accuracy.wape <= 0.25 && accuracy.samples >= 8 && level === "moderate") level = "good";
    if (accuracy.wape > 0.6 && level === "moderate") level = "low";
    reasons.push(`Back-tested error (WAPE) is ${Math.round(accuracy.wape * 100)}% across ${plural(accuracy.samples, "past period")}.`);
  }
  if (attrition.resolved < 30) {
    reasons.push(
      `Cancellation/no-show rate is based on ${plural(attrition.resolved, "resolved appointment")}, so it was blended with a ${Math.round(CANCELLATION_PRIOR_RATE * 100)}% default (applied: ${Math.round(attrition.appliedRate * 100)}%).`,
    );
  }
  if (!upcoming.length && model.method !== "none") {
    reasons.push("No confirmed upcoming appointments in the forecast window; the estimate relies on historical trends only.");
  }
  if (quality.completedWithoutBilling > 0) {
    reasons.push(
      `${plural(quality.completedWithoutBilling, "completed appointment")} ha${quality.completedWithoutBilling === 1 ? "s" : "ve"} no billing record; the listed price (${peso(quality.completedWithoutBillingAmount)}) was counted as collected.`,
    );
  }
  if (quality.duplicateBillingIgnored > 0) {
    reasons.push(`${plural(quality.duplicateBillingIgnored, "duplicate billing record")} for the same appointment ${quality.duplicateBillingIgnored === 1 ? "was" : "were"} ignored.`);
  }
  if (quality.billingOnCancelledExcluded > 0) {
    reasons.push(`${plural(quality.billingOnCancelledExcluded, "paid billing record")} linked to cancelled appointments ${quality.billingOnCancelledExcluded === 1 ? "was" : "were"} excluded.`);
  }
  if (quality.upcomingWithoutPrice > 0) {
    reasons.push(`${plural(quality.upcomingWithoutPrice, "upcoming appointment")} ha${quality.upcomingWithoutPrice === 1 ? "s" : "ve"} no price and contribute ₱0 to the estimate.`);
  }
  if (dataStart && previousPeriodFrom < dataStart) {
    reasons.push("Records began during the comparison period, so growth/decline is measured against a partial period.");
  }

  return {
    granularity: g,
    timeZone: tz,
    today,
    range: { from: rangeFrom, to: rangeTo, requestedFrom: input.historyFrom, requestedTo: input.historyTo },
    horizon: { from: currentStart, to: horizonEnd, periods: cfg.horizon, label: cfg.horizonLabel, unit: cfg.unit },
    history,
    forecast,
    summary: {
      historicalTotal: round2(historicalTotal),
      historicalAverage: history.length ? round2(historicalTotal / history.length) : 0,
      historicalPeriods: history.length,
      historicalTransactions: tx.filter((t) => t.date >= rangeFrom && t.date <= rangeTo).length,
      projectedTotal: round2(projectedTotal),
      collectedSoFar: round2(collectedSoFar),
      expectedFromAppointments: round2(expectedFromAppointments),
      bookedGross: round2(bookedGross),
      upcomingCount: upcoming.length,
      trendTotal: trendTotal === null ? null : round2(trendTotal),
      additionalEstimated: round2(Math.max(0, projectedTotal - collectedSoFar - expectedFromAppointments)),
      previousPeriodTotal: round2(previousPeriodTotal),
      previousPeriodFrom,
      previousPeriodTo,
      growthAmount: growthAmount === null ? null : round2(growthAmount),
      growthPct: growthPct === null ? null : round2(growthPct * 10000) / 10000,
    },
    model: {
      method: model.method,
      methodLabel: METHOD_LABELS[model.method],
      seasonal: model.seasonal,
      trainingPeriods: n,
      dataStart,
      attrition,
      realization,
      accuracy,
    },
    reliability: { level, reasons },
    upcoming,
    comparison,
    dataQuality: { ...quality, completedWithoutBillingAmount: round2(quality.completedWithoutBillingAmount) },
    hasAnyData,
  };
}
