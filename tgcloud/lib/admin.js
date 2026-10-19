import { db } from 'sdk';
import { eq, desc } from 'sdk/db';
import { users, reminders, reminderJobs, deliveryLogs } from '../schema.js';

/**
 * 🔒 Dedicated Admin Telegram User ID list.
 * Only Telegram accounts whose numeric user ID is in this array (or marked isAdmin in the DB)
 * will EVER be granted access to the /admin command or Admin dashboard.
 *
 * 👉 Put your numeric Telegram user ID here (e.g. [123456789, 987654321]).
 * 👉 Send /myid to the bot in Telegram to get your exact Telegram ID instantly.
 */
export const ADMIN_TELEGRAM_IDS = [
  5552044195
];

/**
 * Private master secret for one-time initialization if not set in ADMIN_TELEGRAM_IDS above.
 * Keep this private!
 */
export const MASTER_ADMIN_SECRET = 'VoidAdmin#PrivateSecret99';

/**
 * Strictly verifies whether a Telegram user ID has admin rights.
 * Returns true ONLY if:
 * 1. The ID is in the ADMIN_TELEGRAM_IDS list, OR
 * 2. The user is flagged with isAdmin: true in the database.
 * No random user is ever granted admin privileges.
 */
export async function isUserAdmin(tgId) {
  if (!tgId) return false;
  const numId = Number(tgId);
  if (!isNaN(numId) && ADMIN_TELEGRAM_IDS.includes(numId)) {
    return true;
  }
  const user = await db.select().from(users).where(eq(users.tgId, numId)).get();
  return Boolean(user && user.isAdmin === true);
}

/**
 * Allows the owner to claim admin privileges using the private master secret.
 */
export async function claimAdminAccess(tgId, secret) {
  if (!tgId || !secret) return false;
  if (secret.trim() !== MASTER_ADMIN_SECRET) return false;

  const numId = Number(tgId);
  const user = await db.select().from(users).where(eq(users.tgId, numId)).get();
  if (!user) return false;

  await db.update(users).set({ isAdmin: true }).where(eq(users.id, user.id)).run();
  return true;
}

/**
 * Gathers comprehensive platform metrics for the admin portal.
 */
export async function getSystemAnalytics() {
  const now = Math.floor(Date.now() / 1000);
  const oneDayAgo = now - 86400;
  const oneWeekAgo = now - (7 * 86400);

  // Users metrics
  const allUsers = await db.select().from(users).all();
  const totalUsers = allUsers.length;
  const active24h = allUsers.filter(u => (u.updatedAt || u.createdAt) >= oneDayAgo).length;
  const active7d = allUsers.filter(u => (u.updatedAt || u.createdAt) >= oneWeekAgo).length;

  // Reminders metrics
  const allReminders = await db.select().from(reminders).all();
  const totalReminders = allReminders.length;
  const activeReminders = allReminders.filter(r => !r.isCompleted && !r.isArchived).length;
  const completedReminders = allReminders.filter(r => r.isCompleted).length;

  // Delivery metrics
  const allLogs = await db.select().from(deliveryLogs).all();
  const successfulDeliveries = allLogs.filter(l => l.status === 'success').length;
  const failedDeliveries = allLogs.filter(l => l.status === 'failed').length;
  const totalDeliveries = successfulDeliveries + failedDeliveries;
  const successRate = totalDeliveries > 0
    ? Math.round((successfulDeliveries / totalDeliveries) * 100)
    : 100;

  // Queue health
  const pendingJobs = await db.select().from(reminderJobs).where(eq(reminderJobs.status, 'pending')).all();
  const overdueJobs = pendingJobs.filter(j => j.dueAt < now).length;

  // Recent 5 activity logs
  const recentLogs = await db.select()
    .from(deliveryLogs)
    .orderBy(desc(deliveryLogs.createdAt))
    .limit(5)
    .all();

  return {
    users: {
      total: totalUsers,
      active24h,
      active7d,
    },
    reminders: {
      total: totalReminders,
      active: activeReminders,
      completed: completedReminders,
    },
    delivery: {
      successful: successfulDeliveries,
      failed: failedDeliveries,
      total: totalDeliveries,
      successRate,
    },
    queue: {
      pending: pendingJobs.length,
      overdue: overdueJobs,
      health: overdueJobs === 0 ? 'optimal' : overdueJobs < 5 ? 'normal' : 'backlog',
    },
    recentLogs,
    serverTime: new Date().toISOString(),
  };
}
