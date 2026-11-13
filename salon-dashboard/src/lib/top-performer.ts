import { createClient } from "@/lib/supabase/client";
import { Appointments, StaffDB, type Appointment, type Staff } from "@/lib/db";

export interface ReviewRecord {
    id: string;
    customer_id?: string | null;
    customer_name?: string | null;
    staff_id?: string | null;
    rating: number;
    review?: string | null;
    status?: string | null;
    created_at?: string | null;
}

export interface StaffPerformanceMetrics {
    staffId: string;
    name: string;
    role: string;
    overallScore: number;
    reviewScore: number;
    commentScore: number;
    repeatScore: number;
    demandScore: number;
    completedScore: number;
    reliabilityScore: number;
    avgRating: number;
    reviewCount: number;
    positiveReviewCount: number;
    repeatClients: number;
    uniqueClients: number;
    repeatRate: number;
    completedCount: number;
    relevantCount: number;
    validDemandBookings: number;
    whyTopReason: string;
}

export interface DateRange {
    start: Date;
    end: Date;
    label: string;
}

const POSITIVE_PHRASES = [
    "amazing",
    "professional",
    "love",
    "talented",
    "best",
    "great",
    "excellent",
    "friendly",
    "accommodating",
    "aesthetic",
    "neat",
    "clean",
    "satisfied",
    "recommend",
    "happy",
    "pretty",
    "beautiful",
    "nice",
    "gentle",
    "always book",
    "thank",
    "awesome",
    "superb",
    "kind",
];

const NEGATIVE_PHRASES = [
    "not satisfied",
    "poor service",
    "poor",
    "disappointed",
    "not what i expected",
    "bad",
    "rude",
    "late",
    "slow",
    "painful",
    "messy",
    "worst",
    "terrible",
    "unprofessional",
    "never again",
    "unhappy",
    "awful",
];

function clamp(min: number, max: number, value: number): number {
    return Math.max(min, Math.min(max, value));
}

function round1(value: number): number {
    return Math.round(value * 10) / 10;
}

export function resolvePeriodRange(
    globalSelectedMonth?: string,
    selectedMonthIdx?: number,
    now: Date = new Date()
): DateRange {
    const year = now.getFullYear();
    const month = now.getMonth();

    if (globalSelectedMonth === "Last Month") {
        const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
        const end = new Date(year, month, 0, 23, 59, 59, 999);
        return { start, end, label: "Last Month" };
    }
    if (globalSelectedMonth === "Last 3 Months") {
        const start = new Date(year, month - 2, 1, 0, 0, 0, 0);
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
        return { start, end, label: "Last 3 Months" };
    }
    if (globalSelectedMonth === "This Year") {
        const start = new Date(year, 0, 1, 0, 0, 0, 0);
        const end = new Date(year, 11, 31, 23, 59, 59, 999);
        return { start, end, label: "This Year" };
    }

    const targetMonth = typeof selectedMonthIdx === "number" ? selectedMonthIdx : month;
    const start = new Date(year, targetMonth, 1, 0, 0, 0, 0);
    const end = new Date(year, targetMonth + 1, 0, 23, 59, 59, 999);
    const monthName = start.toLocaleString("en-US", { month: "long" });
    return { start, end, label: monthName };
}

function parseAppointmentDate(apt: Appointment): Date | null {
    const raw = apt.appointment_date || apt.date;
    if (!raw) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(raw).trim())) {
        const [y, m, d] = String(raw).trim().split("-").map(Number);
        return new Date(y, m - 1, d, 12, 0, 0, 0);
    }
    const parsed = new Date(raw);
    return isNaN(parsed.getTime()) ? null : parsed;
}

function appointmentMatchesStaff(apt: Appointment, staff: Staff): boolean {
    if (apt.staff_id && staff.id && apt.staff_id === staff.id) {
        return true;
    }
    const staffNameLower = (staff.name || "").trim().toLowerCase();
    if (!staffNameLower) return false;

    const aptStaffRaw = (apt.staff?.name || apt.staff_name || "").trim().toLowerCase();
    if (!aptStaffRaw || aptStaffRaw === "auto-assigned") return false;

    const parts = aptStaffRaw.split(",").map((p) => p.trim()).filter(Boolean);
    return parts.includes(staffNameLower);
}

function normalizeStatus(status?: string | null): string {
    return String(status || "").trim().toLowerCase();
}

function isCompletedStatus(status: string): boolean {
    return status === "completed";
}

function isCancelledOrNoShowStatus(status: string): boolean {
    return (
        status === "cancelled" ||
        status === "canceled" ||
        status === "no_show" ||
        status === "no-show" ||
        status === "no show"
    );
}

function isValidDemandStatus(status: string): boolean {
    return (
        status === "completed" ||
        status === "scheduled" ||
        status === "in progress" ||
        status === "pending downpayment"
    );
}

function scoreCommentSentiment(text: string, staffName: string): number {
    const lower = text.toLowerCase();
    if (!lower.trim()) return 50;

    let posHits = 0;
    for (const phrase of POSITIVE_PHRASES) {
        if (lower.includes(phrase)) posHits++;
    }

    let negHits = 0;
    for (const phrase of NEGATIVE_PHRASES) {
        if (lower.includes(phrase)) negHits++;
    }

    let score = 50 + posHits * 15 - negHits * 25;

    // Name recognition is only an additional signal when feedback is already positive
    const cleanStaffName = staffName.trim().toLowerCase();
    if (cleanStaffName && lower.includes(cleanStaffName) && posHits > negHits) {
        score += 5;
    }

    return clamp(0, 100, score);
}

function buildWhyTopReason(m: Omit<StaffPerformanceMetrics, "whyTopReason">): string {
    if (
        m.reviewCount === 0 &&
        m.completedCount === 0 &&
        m.validDemandBookings === 0
    ) {
        return "No completed services or customer reviews yet in this period";
    }

    const strengths: { key: string; score: number; label: string }[] = [
        { key: "review", score: m.reviewScore, label: "top customer ratings" },
        { key: "comment", score: m.commentScore, label: "positive client feedback" },
        { key: "repeat", score: m.repeatScore, label: "strong repeat-client loyalty" },
        { key: "demand", score: m.demandScore, label: "high booking demand" },
        { key: "completed", score: m.completedScore, label: "strong completed service volume" },
        { key: "reliability", score: m.reliabilityScore, label: "consistent appointment reliability" },
    ]
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score);

    if (strengths.length === 0) {
        return "Active staff member with developing performance metrics";
    }

    if (strengths.length === 1) {
        const first = strengths[0].label;
        return `Leading with ${first}`;
    }

    const top1 = strengths[0];
    const top2 = strengths[1];

    if (top1.key === "review" && top2.key === "repeat") {
        return "Highly rated by customers and frequently rebooked";
    }
    if (top1.key === "review" && top2.key === "demand") {
        return "Excellent reviews and high booking demand";
    }
    if (top1.key === "repeat" && top2.key === "review") {
        return "Highest repeat-client loyalty with strong reviews";
    }
    if (top1.key === "demand" && top2.key === "reliability") {
        return "Most requested staff with dependable completion rate";
    }

    return `Strongest in ${top1.label} and ${top2.label}`;
}

export function computeStaffPerformanceRanking(
    activeStaff: Staff[],
    allAppointments: Appointment[],
    allReviews: ReviewRecord[],
    periodRange: DateRange
): StaffPerformanceMetrics[] {
    if (!activeStaff || activeStaff.length === 0) return [];

    const periodAppointments = (allAppointments || []).filter((apt) => {
        const d = parseAppointmentDate(apt);
        return d !== null && d >= periodRange.start && d <= periodRange.end;
    });

    const periodReviews = (allReviews || []).filter((rev) => {
        if (normalizeStatus(rev.status) === "rejected") return false;
        if (!rev.created_at) return false;
        const d = new Date(rev.created_at);
        return !isNaN(d.getTime()) && d >= periodRange.start && d <= periodRange.end;
    });

    // Build customer -> non-cancelled appointments map for attributing reviews when reviews table has no staff_id column
    const customerAppointmentsMap = new Map<string, Appointment[]>();
    (allAppointments || []).forEach((apt) => {
        const st = normalizeStatus(apt.status);
        if (isCancelledOrNoShowStatus(st) || st === "rejected" || st === "declined") return;

        const keys: string[] = [];
        if (apt.customer_id) keys.push(`id:${apt.customer_id}`);
        const cname = (apt.customer_name || apt.customers?.name || "").trim().toLowerCase();
        if (cname) keys.push(`name:${cname}`);

        keys.forEach((k) => {
            const list = customerAppointmentsMap.get(k) || [];
            list.push(apt);
            customerAppointmentsMap.set(k, list);
        });
    });

    // Map each review to matching active staff IDs (primary: direct staff_id; fallback: customer's linked appointments)
    const reviewsByStaffId = new Map<string, ReviewRecord[]>();
    activeStaff.forEach((s) => {
        if (s.id) reviewsByStaffId.set(s.id, []);
    });

    periodReviews.forEach((rev) => {
        if (rev.staff_id && reviewsByStaffId.has(rev.staff_id)) {
            reviewsByStaffId.get(rev.staff_id)!.push(rev);
            return;
        }

        const revDate = rev.created_at ? new Date(rev.created_at) : null;
        const candidates: Appointment[] = [];
        if (rev.customer_id) {
            candidates.push(...(customerAppointmentsMap.get(`id:${rev.customer_id}`) || []));
        }
        if (candidates.length === 0 && rev.customer_name) {
            candidates.push(
                ...(customerAppointmentsMap.get(`name:${rev.customer_name.trim().toLowerCase()}`) || [])
            );
        }

        if (candidates.length === 0) return;

        // Prefer the most recent completed appointment on or before the review date
        const sorted = [...candidates]
            .filter((apt) => {
                const d = parseAppointmentDate(apt);
                return !revDate || !d || d <= revDate;
            })
            .sort((a, b) => {
                const da = parseAppointmentDate(a)?.getTime() || 0;
                const db = parseAppointmentDate(b)?.getTime() || 0;
                return db - da;
            });

        const bestApt =
            sorted.find((a) => isCompletedStatus(normalizeStatus(a.status))) ||
            sorted[0] ||
            candidates[0];

        if (!bestApt) return;
        for (const staff of activeStaff) {
            if (staff.id && appointmentMatchesStaff(bestApt, staff)) {
                reviewsByStaffId.get(staff.id)!.push(rev);
            }
        }
    });

    // First pass: collect raw metrics per active staff
    const rawStats = activeStaff.map((staff) => {
        const staffId = staff.id || staff.name;
        const staffApts = periodAppointments.filter((apt) => appointmentMatchesStaff(apt, staff));
        const staffReviews = (staff.id ? reviewsByStaffId.get(staff.id) : []) || [];

        let completedCount = 0;
        let cancelledOrNoShowCount = 0;
        let validDemandBookings = 0;
        const completedClientCounts = new Map<string, number>();
        const demandClientKeys = new Set<string>();

        staffApts.forEach((apt) => {
            const st = normalizeStatus(apt.status);
            const custKey =
                apt.customer_id ||
                (apt.customer_name || apt.customers?.name || "").trim().toLowerCase();

            if (isCompletedStatus(st)) {
                completedCount++;
                if (custKey) {
                    completedClientCounts.set(custKey, (completedClientCounts.get(custKey) || 0) + 1);
                }
            } else if (isCancelledOrNoShowStatus(st)) {
                cancelledOrNoShowCount++;
            }

            if (isValidDemandStatus(st)) {
                validDemandBookings++;
                if (custKey) {
                    demandClientKeys.add(custKey);
                }
            }
        });

        const uniqueClients = completedClientCounts.size;
        let repeatClients = 0;
        completedClientCounts.forEach((count) => {
            if (count >= 2) repeatClients++;
        });
        const repeatRate = uniqueClients > 0 ? (repeatClients / uniqueClients) * 100 : 0;

        const relevantCount = completedCount + cancelledOrNoShowCount;
        const reliabilityScore = relevantCount > 0 ? (completedCount / relevantCount) * 100 : 0;

        const reviewCount = staffReviews.length;
        const avgRating =
            reviewCount > 0
                ? staffReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviewCount
                : 0;
        const positiveReviewCount = staffReviews.filter((r) => Number(r.rating) >= 4).length;
        const positivePct = reviewCount > 0 ? (positiveReviewCount / reviewCount) * 100 : 0;

        // Bayesian confidence-adjusted review score so 1x 5.0 review does not beat 30x 4.8 reviews
        const priorMean = 3.5;
        const priorWeight = 5;
        const reviewScore =
            reviewCount > 0
                ? clamp(
                      0,
                      100,
                      (((reviewCount * avgRating + priorWeight * priorMean) /
                          (reviewCount + priorWeight)) /
                          5) *
                          100 *
                          0.75 +
                          positivePct * 0.25
                  )
                : 0;

        const reviewsWithText = staffReviews.filter((r) => Boolean(r.review && r.review.trim()));
        const commentScore =
            reviewsWithText.length > 0
                ? reviewsWithText.reduce(
                      (sum, r) => sum + scoreCommentSentiment(r.review || "", staff.name),
                      0
                  ) / reviewsWithText.length
                : reviewCount > 0
                ? positivePct * 0.8
                : 0;

        return {
            staffId,
            name: staff.name,
            role: staff.role || "Salon Specialist",
            reviewScore,
            commentScore,
            repeatScore: clamp(0, 100, repeatRate),
            reliabilityScore: clamp(0, 100, reliabilityScore),
            avgRating: round1(avgRating),
            reviewCount,
            positiveReviewCount,
            repeatClients,
            uniqueClients,
            repeatRate: round1(repeatRate),
            completedCount,
            relevantCount,
            validDemandBookings,
            uniqueDemandCustomers: demandClientKeys.size,
        };
    });

    const maxCompleted = Math.max(1, ...rawStats.map((s) => s.completedCount));
    const maxValidDemand = Math.max(1, ...rawStats.map((s) => s.validDemandBookings));
    const maxUniqueDemand = Math.max(1, ...rawStats.map((s) => s.uniqueDemandCustomers));

    const scored: StaffPerformanceMetrics[] = rawStats.map((s) => {
        const completedScore = s.completedCount > 0 ? (s.completedCount / maxCompleted) * 100 : 0;

        const demandShare =
            s.validDemandBookings > 0 ? (s.validDemandBookings / maxValidDemand) * 100 : 0;
        const uniqueDemandShare =
            s.uniqueDemandCustomers > 0 ? (s.uniqueDemandCustomers / maxUniqueDemand) * 100 : 0;
        const repeatBookingRatio =
            s.validDemandBookings > 0
                ? ((s.validDemandBookings - s.uniqueDemandCustomers) / s.validDemandBookings) * 100
                : 0;
        const demandScore =
            s.validDemandBookings > 0
                ? clamp(
                      0,
                      100,
                      demandShare * 0.5 + uniqueDemandShare * 0.3 + repeatBookingRatio * 0.2
                  )
                : 0;

        const overallScore = round1(
            s.reviewScore * 0.3 +
                s.commentScore * 0.15 +
                s.repeatScore * 0.2 +
                demandScore * 0.15 +
                completedScore * 0.1 +
                s.reliabilityScore * 0.1
        );

        const baseMetric: Omit<StaffPerformanceMetrics, "whyTopReason"> = {
            staffId: s.staffId,
            name: s.name,
            role: s.role,
            overallScore,
            reviewScore: round1(s.reviewScore),
            commentScore: round1(s.commentScore),
            repeatScore: round1(s.repeatScore),
            demandScore: round1(demandScore),
            completedScore: round1(completedScore),
            reliabilityScore: round1(s.reliabilityScore),
            avgRating: s.avgRating,
            reviewCount: s.reviewCount,
            positiveReviewCount: s.positiveReviewCount,
            repeatClients: s.repeatClients,
            uniqueClients: s.uniqueClients,
            repeatRate: s.repeatRate,
            completedCount: s.completedCount,
            relevantCount: s.relevantCount,
            validDemandBookings: s.validDemandBookings,
        };

        return {
            ...baseMetric,
            whyTopReason: buildWhyTopReason(baseMetric),
        };
    });

    // Rank with deterministic tie-breakers
    scored.sort((a, b) => {
        if (b.overallScore !== a.overallScore) return b.overallScore - a.overallScore;
        if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
        if (b.repeatRate !== a.repeatRate) return b.repeatRate - a.repeatRate;
        if (b.demandScore !== a.demandScore) return b.demandScore - a.demandScore;
        if (b.reliabilityScore !== a.reliabilityScore) return b.reliabilityScore - a.reliabilityScore;
        return b.completedCount - a.completedCount;
    });

    return scored;
}

export async function fetchTopPerformerRanking(
    periodRange: DateRange
): Promise<StaffPerformanceMetrics[]> {
    const supabase = createClient();

    const [staffList, allAppointments, reviewsRes] = await Promise.all([
        StaffDB.list(),
        Appointments.list(),
        supabase.from("reviews").select("id, customer_id, customer_name, appointment_id, staff_id, rating, review, status, created_at"),
    ]);

    const activeStaff = (staffList || []).filter(
        (s) => (s.employment_status || "Active").toLowerCase() !== "inactive"
    );

    const reviews: ReviewRecord[] = reviewsRes.error ? [] : (reviewsRes.data || []);
    return computeStaffPerformanceRanking(activeStaff, allAppointments || [], reviews, periodRange);
}

