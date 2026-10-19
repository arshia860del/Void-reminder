import { db, EndpointError } from 'sdk';
import { eq, and, desc } from 'sdk/db';
import { reminders, users } from '../schema.js';
import { processDueReminders } from '../lib/queue.js';
import { isUserAdmin } from '../lib/admin.js';

export default async function (input, ctx) {
  const user = ctx?.initData?.user;
  if (!user || !user.id) {
    throw new EndpointError('Authentication required', { code: 'UNAUTHORIZED' });
  }

  // Opportunistic queue run
  try {
    await processDueReminders(10);
  } catch (err) {
    console.error('[endpoint:getReminders] Queue tick error:', err);
  }

  const userId = user.id;

  // Fetch reminders
  const allReminders = await db.select()
    .from(reminders)
    .where(and(eq(reminders.userId, userId), eq(reminders.isArchived, false)))
    .orderBy(desc(reminders.targetTimestamp))
    .all();

  const userRecord = await db.select()
    .from(users)
    .where(eq(users.tgId, userId))
    .get();

  const isAdmin = await isUserAdmin(userId);

  const active = allReminders.filter((r) => !r.isCompleted);
  const completed = allReminders.filter((r) => r.isCompleted);

  return {
    reminders: allReminders,
    isAdmin,
    stats: {
      total: allReminders.length,
      active: active.length,
      completed: completed.length,
    },
    userPreferences: {
      lang: userRecord?.lang || 'fa',
      calendarType: userRecord?.calendarType || 'jalali',
      timezone: userRecord?.timezone || 'Asia/Tehran',
    }
  };
}
