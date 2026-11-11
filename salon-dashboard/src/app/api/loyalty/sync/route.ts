import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  computeMonthlyTop5Customers,
  getRankingPeriodInfo,
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const now = new Date();
    const year = typeof body.year === "number" ? body.year : now.getFullYear();
    const monthIdx =
      typeof body.monthIdx === "number" ? body.monthIdx : now.getMonth();

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Auto-expire any AVAILABLE rewards whose valid_until has passed
    await supabase
      .from("loyalty_rewards")
      .update({ status: "EXPIRED", updated_at: now.toISOString() })
      .eq("status", "AVAILABLE")
      .lt("valid_until", now.toISOString());

    // 2. Fetch active loyalty reward settings
    const { data: settingsRow } = await supabase
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

    // 3. Load appointments, billing, and customers for ranking calculation
    const [{ data: appts }, { data: bills }, { data: customers }] =
      await Promise.all([
        supabase.from("appointments").select("*"),
        supabase.from("billing").select("*"),
        supabase.from("customers").select("*"),
      ]);

    const top5 = computeMonthlyTop5Customers(
      appts || [],
      bills || [],
      customers || [],
      year,
      monthIdx,
      settings.top_limit || 5
    );

    const periodInfo = getRankingPeriodInfo(year, monthIdx);
    const rewardDesc = buildRewardDescription(
      settings.reward_type,
      settings.reward_value,
      settings.free_service_name
    );

    // 4. Fetch existing loyalty rewards for this ranking period
    const { data: existingPeriodRewards } = await supabase
      .from("loyalty_rewards")
      .select("*")
      .eq("ranking_period", periodInfo.rankingPeriod);

    const existingMap = new Map<string, LoyaltyRewardRecord>();
    for (const r of existingPeriodRewards || []) {
      existingMap.set(r.customer_id, r as LoyaltyRewardRecord);
    }

    const activeTop5CustomerIds = new Set<string>();
    const syncedRewards: LoyaltyRewardRecord[] = [];

    if (settings.is_active) {
      for (const candidate of top5) {
        let customerId = candidate.customer_id;

        // Ensure a customer record exists if ranked by legacy walk-in name
        if (!customerId && candidate.customer_name) {
          const matchedCust = (customers || []).find(
            (c: any) =>
              (c.name || "").trim().toLowerCase() ===
              candidate.customer_name.trim().toLowerCase()
          );
          if (matchedCust) {
            customerId = matchedCust.id;
          } else {
            const { data: createdCust } = await supabase
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
        activeTop5CustomerIds.add(customerId);

        const existing = existingMap.get(customerId);

        if (existing) {
          // Update rank and spend metrics; if still AVAILABLE, sync current reward config
          const updatePayload: Record<string, any> = {
            rank_position: candidate.rank,
            total_spent: candidate.total_spent,
            completed_transactions: candidate.completed_transactions,
            customer_name: candidate.customer_name,
            customer_email:
              candidate.customer_email || existing.customer_email || null,
            updated_at: now.toISOString(),
          };

          if (existing.status === "AVAILABLE") {
            updatePayload.reward_type = settings.reward_type;
            updatePayload.reward_value = settings.reward_value;
            updatePayload.free_service_id = settings.free_service_id;
            updatePayload.free_service_name = settings.free_service_name;
            updatePayload.reward_description = rewardDesc;
          }

          const { data: updatedReward } = await supabase
            .from("loyalty_rewards")
            .update(updatePayload)
            .eq("id", existing.id)
            .select("*")
            .single();

          if (updatedReward) {
            syncedRewards.push(updatedReward as LoyaltyRewardRecord);
          } else {
            syncedRewards.push({
              ...existing,
              ...updatePayload,
            } as LoyaltyRewardRecord);
          }
        } else {
          // Insert new reward for this customer + ranking_period
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
            status:
              new Date(periodInfo.validUntil) < now ? "EXPIRED" : "AVAILABLE",
            valid_from: periodInfo.validFrom,
            valid_until: periodInfo.validUntil,
          };

          const { data: createdReward } = await supabase
            .from("loyalty_rewards")
            .insert(insertPayload)
            .select("*")
            .single();

          if (createdReward) {
            syncedRewards.push(createdReward as LoyaltyRewardRecord);

            // Notify newly qualified Top 5 Customer (in-app notification + email if available)
            if (createdReward.status === "AVAILABLE") {
              const validUntilFormatted = new Date(
                createdReward.valid_until
              ).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              });

              await supabase.from("notifications").insert({
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
                    supabase,
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

              await supabase
                .from("loyalty_rewards")
                .update({ notified_at: now.toISOString() })
                .eq("id", createdReward.id);
            }
          }
        }
      }

      // 5. Handle edge case: customer dropped out of Top 5 during the active ranking month
      // Only remove unredeemed (AVAILABLE) rewards for the current month if they were overtaken
      for (const existing of existingPeriodRewards || []) {
        if (
          !activeTop5CustomerIds.has(existing.customer_id) &&
          existing.status === "AVAILABLE"
        ) {
          await supabase.from("loyalty_rewards").delete().eq("id", existing.id);
        } else if (!activeTop5CustomerIds.has(existing.customer_id)) {
          // Keep USED/EXPIRED historical records intact
          syncedRewards.push(existing as LoyaltyRewardRecord);
        }
      }
    }

    return NextResponse.json({
      top5,
      rewards: syncedRewards,
      settings,
      periodInfo,
    });
  } catch (err: any) {
    console.error("[LOYALTY SYNC ERROR]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to sync loyalty rewards" },
      { status: 500 }
    );
  }
}

