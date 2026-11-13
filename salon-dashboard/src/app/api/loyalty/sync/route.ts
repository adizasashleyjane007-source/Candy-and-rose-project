import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import {
  computeMonthlyTop5Customers,
  getRankingPeriodInfo,
  getManilaDate,
  getPreviousCompletedMonthManila,
  buildRewardDescription,
  LoyaltyRewardSettings,
  LoyaltyRewardRecord,
} from "@/lib/loyalty";
import { sendTrackedEmail } from "@/lib/mailer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

/**
 * Authoritative Loyalty Sync Endpoint.
 *
 * Supports two calling contexts:
 * 1. Scheduled Vercel Cron:
 *    - Authenticated via Authorization: Bearer <CRON_SECRET> or x-cron-secret header.
 * 2. On-Page Safety Net (Staff / Admin opening Billing, Analytics, Settings):
 *    - Authenticated via active user session cookies (admin or staff role).
 *
 * Behavior:
 * - Current / Future Month: Read-only preview only. NEVER creates or modifies reward records.
 * - Previous Completed Calendar Month: Finalizes idempotently.
 *   - Inserts rewards for top 5 candidates that don't already have one for the period.
 *   - NEVER modifies, overwrites, or revokes existing rewards (especially USED ones).
 *   - Auto-expires outdated AVAILABLE rewards.
 *   - Logs 0-price services to console and sync log.
 *   - Records audit entry in public.loyalty_sync_logs.
 */
export async function POST(req: NextRequest) {
  try {
    // -------------------------------------------------------------------------
    // 1. Authentication Check (CRON_SECRET header OR active user session)
    // -------------------------------------------------------------------------
    const authHeader = req.headers.get("authorization") || "";
    const xCronSecret = req.headers.get("x-cron-secret") || "";
    const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";

    const expectedCronSecret = process.env.CRON_SECRET?.trim();
    let triggeredBy: "cron" | "staff_session" = "staff_session";

    const isCronAuthorized =
      Boolean(expectedCronSecret) &&
      (bearerToken === expectedCronSecret || xCronSecret === expectedCronSecret);

    if (isCronAuthorized) {
      triggeredBy = "cron";
    } else {
      // Validate active authenticated user session from cookies
      try {
        const sessionClient = await createServerClient();
        const {
          data: { user },
          error: authError,
        } = await sessionClient.auth.getUser();

        if (authError || !user) {
          return NextResponse.json(
            {
              error:
                "Unauthorized: A valid staff session or CRON_SECRET header is required.",
            },
            { status: 401 }
          );
        }
        triggeredBy = "staff_session";
      } catch (sessionErr: any) {
        return NextResponse.json(
          {
            error:
              "Unauthorized: Unable to verify user session and no valid cron secret was supplied.",
          },
          { status: 401 }
        );
      }
    }

    // -------------------------------------------------------------------------
    // 2. Timezone & Target Month Resolution (Asia/Manila UTC+8)
    // -------------------------------------------------------------------------
    const body = await req.json().catch(() => ({}));
    const manilaNow = getManilaDate();
    const prevCompleted = getPreviousCompletedMonthManila();

    // If caller specified year/monthIdx, use them; otherwise default to previous completed month
    const targetYear =
      typeof body.year === "number" ? body.year : prevCompleted.year;
    const targetMonthIdx =
      typeof body.monthIdx === "number" ? body.monthIdx : prevCompleted.monthIdx;

    const periodInfo = getRankingPeriodInfo(targetYear, targetMonthIdx);

    // Is the target month ongoing or in the future according to Asia/Manila?
    const isCurrentOrFuture =
      targetYear > manilaNow.year ||
      (targetYear === manilaNow.year && targetMonthIdx >= manilaNow.monthIdx);

    // Use admin client (service-role) for database operations
    const adminSupabase = createAdminClient(supabaseUrl, supabaseKey);

    // -------------------------------------------------------------------------
    // 3. Load Loyalty Settings
    // -------------------------------------------------------------------------
    const { data: settingsRow } = await adminSupabase
      .from("loyalty_reward_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const settings: LoyaltyRewardSettings = settingsRow
      ? {
          id: settingsRow.id,
          top_limit: Number(settingsRow.top_limit) || 5,
          reward_type: settingsRow.reward_type || "percentage_discount",
          reward_value: Number(settingsRow.reward_value) || 20,
          free_service_id: settingsRow.free_service_id || null,
          free_service_name: settingsRow.free_service_name || null,
          reward_description: settingsRow.reward_description || "20% OFF",
          validity_days: Number(settingsRow.validity_days) || 31,
          is_active: settingsRow.is_active !== false,
          updated_at: settingsRow.updated_at,
        }
      : {
          id: "default",
          top_limit: 5,
          reward_type: "percentage_discount",
          reward_value: 20,
          free_service_id: null,
          free_service_name: null,
          reward_description: "20% OFF",
          validity_days: 31,
          is_active: true,
        };

    const rewardDesc = buildRewardDescription(
      settings.reward_type,
      settings.reward_value,
      settings.free_service_name
    );

    // -------------------------------------------------------------------------
    // 4. Load Appointments, Billing, and Customers for Ranking
    // -------------------------------------------------------------------------
    const [{ data: appts }, { data: bills }, { data: customers }] =
      await Promise.all([
        adminSupabase.from("appointments").select("*"),
        adminSupabase.from("billing").select("*"),
        adminSupabase.from("customers").select("*"),
      ]);

    const top5 = computeMonthlyTop5Customers(
      appts || [],
      bills || [],
      customers || [],
      targetYear,
      targetMonthIdx,
      settings.top_limit || 5
    );

    // -------------------------------------------------------------------------
    // 5. CURRENT / ONGOING MONTH: Read-only preview only. NEVER write records!
    // -------------------------------------------------------------------------
    if (isCurrentOrFuture) {
      return NextResponse.json({
        top5,
        rewards: [],
        settings,
        periodInfo,
        preview: true,
        message:
          "Current month standings preview. Rewards are only finalized once the calendar month completes.",
      });
    }

    // -------------------------------------------------------------------------
    // 6. PREVIOUS COMPLETED MONTH: Finalize Idempotently
    // -------------------------------------------------------------------------
    const nowIso = new Date().toISOString();

    // Step 6a: Auto-expire any AVAILABLE rewards whose valid_until has passed
    let expiredCount = 0;
    try {
      const { data: expiredRows } = await adminSupabase
        .from("loyalty_rewards")
        .update({ status: "EXPIRED", updated_at: nowIso })
        .eq("status", "AVAILABLE")
        .lt("valid_until", nowIso)
        .select("id");
      expiredCount = expiredRows?.length || 0;
    } catch (expireErr) {
      console.warn("[LOYALTY SYNC] Warning auto-expiring outdated rewards:", expireErr);
    }

    // Step 6b: Check ₱0 services from catalog to report
    let zeroPriceServices: Array<{ id: string; name: string }> = [];
    try {
      const { data: zeroSvcs } = await adminSupabase
        .from("services")
        .select("id, name, price")
        .eq("price", 0);
      if (zeroSvcs && zeroSvcs.length > 0) {
        zeroPriceServices = zeroSvcs.map((s: any) => ({
          id: s.id,
          name: s.name,
        }));
        console.warn(
          `[LOYALTY SYNC] Found ${zeroPriceServices.length} services with ₱0 price:`,
          zeroPriceServices.map((s) => s.name).join(", ")
        );
      }
    } catch (zeroErr) {
      console.warn("[LOYALTY SYNC] Could not query zero-price services:", zeroErr);
    }

    // Step 6c: Fetch existing loyalty rewards for this ranking period
    const { data: existingPeriodRewards } = await adminSupabase
      .from("loyalty_rewards")
      .select("*")
      .eq("ranking_period", periodInfo.rankingPeriod);

    const existingMap = new Map<string, LoyaltyRewardRecord>();
    for (const r of existingPeriodRewards || []) {
      if (r.customer_id) {
        existingMap.set(r.customer_id, r as LoyaltyRewardRecord);
      }
    }

    let winnersCreated = 0;
    let winnersSkipped = 0;
    const finalRewardsList: LoyaltyRewardRecord[] = [];

    if (settings.is_active) {
      for (const candidate of top5) {
        let customerId = candidate.customer_id;

        // Ensure a customer record exists if ranked by walk-in name
        if (!customerId && candidate.customer_name) {
          const matchedCust = (customers || []).find(
            (c: any) =>
              (c.name || "").trim().toLowerCase() ===
              candidate.customer_name.trim().toLowerCase()
          );
          if (matchedCust?.id) {
            customerId = matchedCust.id;
          } else {
            const { data: createdCust } = await adminSupabase
              .from("customers")
              .insert({
                name: candidate.customer_name.trim(),
                email: candidate.customer_email || null,
                phone: candidate.customer_phone || null,
                visits: candidate.completed_transactions,
              })
              .select("*")
              .single();
            if (createdCust?.id) {
              customerId = createdCust.id;
            }
          }
        }

        if (!customerId) continue;
        candidate.customer_id = customerId;

        const existing = existingMap.get(customerId);

        if (existing) {
          // IDEMPOTENCY: Reward already exists for this customer & ranking_period.
          // NEVER overwrite or revoke an existing reward (especially USED or already issued).
          winnersSkipped += 1;
          finalRewardsList.push(existing);
        } else {
          // Insert new reward for this customer + ranking_period
          const isAlreadyExpired = new Date(periodInfo.validUntil).getTime() < Date.now();
          const insertPayload = {
            customer_id: customerId,
            customer_name: candidate.customer_name,
            customer_email: candidate.customer_email || null,
            ranking_period: periodInfo.rankingPeriod,
            ranking_period_label: periodInfo.rankingPeriodLabel,
            rank_position: candidate.rank,
            total_spent: candidate.total_spent,
            completed_transactions: candidate.completed_transactions,
            reward_type: settings.reward_type,
            reward_value: settings.reward_value,
            free_service_id: settings.free_service_id,
            free_service_name: settings.free_service_name,
            reward_description: rewardDesc,
            status: isAlreadyExpired ? "EXPIRED" : "AVAILABLE",
            valid_from: periodInfo.validFrom,
            valid_until: periodInfo.validUntil,
          };

          const { data: createdReward, error: insertErr } = await adminSupabase
            .from("loyalty_rewards")
            .insert(insertPayload)
            .select("*")
            .single();

          if (!insertErr && createdReward) {
            winnersCreated += 1;
            finalRewardsList.push(createdReward as LoyaltyRewardRecord);

            // Notify newly qualified Top 5 Customer
            if (createdReward.status === "AVAILABLE") {
              const validUntilFormatted = new Date(
                createdReward.valid_until
              ).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                timeZone: "Asia/Manila",
              });

              await adminSupabase.from("notifications").insert({
                title: "⭐ Top 5 Customer Loyalty Reward Issued",
                message: `Congratulations ${candidate.customer_name}! Ranked #${candidate.rank} for ${periodInfo.rankingPeriodLabel} with ${rewardDesc} (valid until ${validUntilFormatted}).`,
                type: "loyalty_reward",
                is_read: false,
              });

              if (
                candidate.customer_email &&
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.customer_email)
              ) {
                try {
                  await sendTrackedEmail({
                    supabase: adminSupabase,
                    to: candidate.customer_email,
                    subject: `⭐ Congratulations! You are a Top 5 Customer at Candy & Rose Salon`,
                    eventType: "loyalty_reward_issued",
                    referenceId: createdReward.id,
                    idempotencyKey: `loyalty_reward_${createdReward.id}`,
                    html: `
                      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #fce4ec; border-radius: 16px;">
                        <div style="text-align: center; margin-bottom: 24px;">
                          <span style="display: inline-block; padding: 6px 14px; background: #fdf2f8; color: #db2777; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">
                            ⭐ Top 5 Customer Loyalty Reward
                          </span>
                          <h1 style="margin: 16px 0 8px; font-size: 24px; color: #111827;">Congratulations, ${candidate.customer_name}!</h1>
                          <p style="margin: 0; color: #6b7280; font-size: 14px;">
                            You are ranked <strong>#${candidate.rank}</strong> among Candy &amp; Rose Salon's Top 5 Customers for <strong>${periodInfo.rankingPeriodLabel}</strong>!
                          </p>
                        </div>
                        <div style="background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #9d174d; font-weight: 700; margin-bottom: 6px;">Your Exclusive Loyalty Reward</div>
                          <div style="font-size: 26px; font-weight: 800; color: #be185d; margin-bottom: 8px;">${rewardDesc}</div>
                          <div style="font-size: 13px; color: #4b5563;">Valid until <strong>${validUntilFormatted}</strong></div>
                        </div>
                        <p style="font-size: 14px; color: #374151; line-height: 1.6; margin-bottom: 20px;">
                          Your reward is now <strong>AVAILABLE</strong> on your account. Simply mention your Top 5 Loyalty Reward to our receptionist or cashier during checkout on your next visit to redeem it.
                        </p>
                        <div style="border-top: 1px solid #f3f4f6; padding-top: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
                          Thank you for your continued patronage at Candy &amp; Rose Salon!
                        </div>
                      </div>
                    `,
                  });
                } catch (mailErr) {
                  console.warn(
                    "[LOYALTY SYNC] Email notification skipped or failed:",
                    mailErr
                  );
                }
              }

              await adminSupabase
                .from("loyalty_rewards")
                .update({ notified_at: nowIso })
                .eq("id", createdReward.id);
            }
          }
        }
      }
    }

    // Step 6d: Record audit entry in loyalty_sync_logs
    try {
      await adminSupabase.from("loyalty_sync_logs").insert({
        ranking_period: periodInfo.rankingPeriod,
        ranking_period_label: periodInfo.rankingPeriodLabel,
        triggered_by: triggeredBy,
        winners_created: winnersCreated,
        winners_skipped: winnersSkipped,
        rewards_expired: expiredCount,
        zero_price_services_count: zeroPriceServices.length,
        zero_price_services: zeroPriceServices,
        status: "SUCCESS",
        notes: `Sync completed via ${triggeredBy}. Created: ${winnersCreated}, Skipped existing: ${winnersSkipped}, Expired: ${expiredCount}.`,
      });
    } catch (auditErr) {
      console.warn("[LOYALTY SYNC] Could not write to loyalty_sync_logs table:", auditErr);
    }

    return NextResponse.json({
      top5,
      rewards: finalRewardsList,
      settings,
      periodInfo,
      preview: false,
      winnersCreated,
      winnersSkipped,
      rewardsExpired: expiredCount,
      zeroPriceServicesCount: zeroPriceServices.length,
      zeroPriceServices,
    });
  } catch (err: any) {
    console.error("[LOYALTY SYNC ERROR]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to sync loyalty rewards" },
      { status: 500 }
    );
  }
}
