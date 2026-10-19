import { db, EndpointError } from 'sdk';
import { reminders, users } from '../schema.js';
import { formatJalali, formatGregorian } from '../lib/dates.js';
import { scheduleJobForReminder } from '../lib/queue.js';
import { eq } from 'sdk/db';

export default async function (input, ctx) {
  const user = ctx?.initData?.user;
  if (!user || !user.id) {
    throw new EndpointError('Authentication required', { code: 'UNAUTHORIZED' });
  }

  const { title, description, category, priority, targetTimestamp, recurrence } = input || {};

  if (!title || typeof title !== 'string' || !title.trim()) {
    throw new EndpointError('Title is required', { code: 'INVALID_TITLE' });
  }

  const targetTs = parseInt(targetTimestamp, 10);
  if (!targetTs || isNaN(targetTs) || targetTs <= 0) {
    throw new EndpointError('Valid targetTimestamp is required', { code: 'INVALID_TIMESTAMP' });
  }

  const userRecord = await db.select().from(users).where(eq(users.tgId, user.id)).get();
  const chatId = userRecord?.chatId || user.id;

  const now = Math.floor(Date.now() / 1000);
  const targetJalali = formatJalali(targetTs);
  const targetGregorian = formatGregorian(targetTs);

  const result = await db.insert(reminders).values({
    userId: user.id,
    chatId,
    title: title.trim(),
    description: description ? description.trim() : null,
    category: category || 'general',
    priority: priority || 'normal',
    targetTimestamp: targetTs,
    targetJalali,
    targetGregorian,
    recurrence: recurrence || 'once',
    advanceNoticeMinutes: 0,
    isCompleted: false,
    isArchived: false,
    snoozeCount: 0,
    createdAt: now,
    updatedAt: now,
  }).returning().run();

  const created = result[0];

  if (created) {
    await scheduleJobForReminder(created);
  }

  return { ok: true, reminder: created };
}
