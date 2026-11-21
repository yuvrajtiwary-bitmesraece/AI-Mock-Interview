import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDb } from "./db.js";
import { getDailyLimit, utcDay } from "./limits.js";
import { withRetry } from "./retry.js";
import { UsageCounter } from "./schema.js";

/**
 * Counts one `action` ("interview", "answer" or "report") for the user today
 * and reports whether it's within the daily limit. A single upsert, so two
 * requests at the same moment can't both slip under the limit.
 */
export async function consumeDailyQuota(userId, action) {
  const limit = getDailyLimit(action);
  if (limit === Infinity) return { allowed: true, limit, used: 0 };

  // Retried on network errors: at worst a retry counts one use twice, which
  // is harmless for a daily limit and better than failing the request.
  const [row] = await withRetry(() =>
    getDb()
      .insert(UsageCounter)
      .values({ userId, day: utcDay(), action, count: 1 })
      .onConflictDoUpdate({
        target: [UsageCounter.userId, UsageCounter.day, UsageCounter.action],
        set: { count: sql`${UsageCounter.count} + 1` },
      })
      .returning({ count: UsageCounter.count })
  );

  return { allowed: row.count <= limit, limit, used: row.count };
}

/** How many times `action` was used today and the daily limit, for display. */
export async function getUsageToday(userId, action) {
  const limit = getDailyLimit(action);
  const [row] = await withRetry(() =>
    getDb()
      .select({ count: UsageCounter.count })
      .from(UsageCounter)
      .where(and(eq(UsageCounter.userId, userId), eq(UsageCounter.day, utcDay()), eq(UsageCounter.action, action)))
      .limit(1)
  );
  return { used: row?.count ?? 0, limit };
}

/** Gives one use back, e.g. when the AI request failed, so the user isn't charged for it. */
export async function refundDailyQuota(userId, action) {
  if (getDailyLimit(action) === Infinity) return;
  try {
    await getDb()
      .update(UsageCounter)
      .set({ count: sql`greatest(${UsageCounter.count} - 1, 0)` })
      .where(and(eq(UsageCounter.userId, userId), eq(UsageCounter.day, utcDay()), eq(UsageCounter.action, action)));
  } catch (error) {
    console.error("[usage] refund failed:", error);
  }
}
