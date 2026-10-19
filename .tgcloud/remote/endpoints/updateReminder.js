import { db, EndpointError } from 'sdk';
import { eq, and } from 'sdk/db';
import { reminders } from '../schema.js';
import { formatJalali, formatGregorian } from '../lib/dates.js';
import { scheduleJobForReminder } from '../lib/queue.js';

export default async function (input, ctx) {
  const user = ctx?.initData?.user;
  if (!user || !user.id) {
    throw new EndpointError('Authentication required', { code: 'UNAUTHORIZED' });
  }

  const { id, isCompleted, snoozeMinutes, title, description, targetTimestamp, recurrence } = input || {};
  const remId = parseInt(id, 10);
  if (!remId) {
    throw new EndpointError('Valid reminder id is required', { code: 'INVALID_ID' });
  }

  const reminder = await db.select()
    .from(reminders)
    .where(and(eq(reminders.id, remId), eq(reminders.userId, user.id)))
    .get();

  if (!reminder) {
    throw new EndpointError('Reminder not found', { code: 'NOT_FOUND' });
  }

  const now = Math.floor(Date.now() / 1000);
  const updates = { updatedAt: now };

  if (typeof isCompleted === 'boolean') {
    updates.isCompleted = isCompleted;
  }

  if (title && typeof title === 'string') {
    updates.title = title.trim();
  }

  if (description !== undefined) {
    updates.description = description ? description.trim() : null;
  }

  if (recurrence) {
    updates.recurrence = recurrence;
  }

  if (snoozeMinutes && parseInt(snoozeMinutes, 10) > 0) {
    const mins = parseInt(snoozeMinutes, 10);
    const newTimestamp = now + (mins * 60);
    updates.targetTimestamp = newTimestamp;
    updates.targetJalali = formatJalali(newTimestamp);
    updates.targetGregorian = formatGregorian(newTimestamp);
    updates.isCompleted = false;
    updates.snoozeCount = (reminder.snoozeCount || 0) + 1;

    await scheduleJobForReminder({
      id: reminder.id,
      userId: user.id,
      chatId: reminder.chatId,
      targetTimestamp: newTimestamp,
    });
  } else if (targetTimestamp) {
    const targetTs = parseInt(targetTimestamp, 10);
    updates.targetTimestamp = targetTs;
    updates.targetJalali = formatJalali(targetTs);
    updates.targetGregorian = formatGregorian(targetTs);

    await scheduleJobForReminder({
      id: reminder.id,
      userId: user.id,
      chatId: reminder.chatId,
      targetTimestamp: targetTs,
    });
  }

  const result = await db.update(reminders)
    .set(updates)
    .where(and(eq(reminders.id, remId), eq(reminders.userId, user.id)))
    .returning()
    .run();

  return { ok: true, reminder: result[0] };
}
