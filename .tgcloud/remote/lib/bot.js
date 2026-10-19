import { db } from 'sdk';
import { eq, and, sql, desc, gte, lte } from 'sdk/db';
import { users, reminders } from '../schema.js';
import { formatJalali, formatGregorian, gregorianToJalali } from './dates.js';
import { t } from './i18n.js';
import { getMainMenuKeyboard } from './keyboards.js';

/**
 * Ensures user exists in SQLite DB with preferences and returns the user object.
 */
export async function getOrCreateUser(fromUser, chat) {
  const tgId = fromUser.id;
  let user = await db.select().from(users).where(eq(users.tgId, tgId)).get();

  const now = Math.floor(Date.now() / 1000);
  if (!user) {
    const lang = fromUser.language_code?.startsWith('fa') ? 'fa' : 'fa';
    await db.insert(users).values({
      tgId,
      chatId: chat.id,
      username: fromUser.username || null,
      firstName: fromUser.first_name || '',
      lastName: fromUser.last_name || null,
      lang,
      calendarType: 'jalali',
      timezone: 'Asia/Tehran',
      stepState: null,
      createdAt: now,
      updatedAt: now,
    }).run();

    user = await db.select().from(users).where(eq(users.tgId, tgId)).get();
  } else if (user.chatId !== chat.id) {
    await db.update(users)
      .set({ chatId: chat.id, updatedAt: now })
      .where(eq(users.id, user.id))
      .run();
    user.chatId = chat.id;
  }

  return user;
}

/**
 * Returns user's list of active reminders
 */
export async function getUserReminders(tgId, includeCompleted = false, limit = 15) {
  const conditions = [eq(reminders.userId, tgId), eq(reminders.isArchived, false)];
  if (!includeCompleted) {
    conditions.push(eq(reminders.isCompleted, false));
  }

  return await db.select()
    .from(reminders)
    .where(and(...conditions))
    .orderBy(desc(reminders.createdAt))
    .limit(limit)
    .all();
}

/**
 * Returns reminders scheduled for today
 */
export async function getTodayReminders(tgId) {
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));

  const startSec = Math.floor(startOfDay.getTime() / 1000);
  const endSec = Math.floor(endOfDay.getTime() / 1000);

  return await db.select()
    .from(reminders)
    .where(
      and(
        eq(reminders.userId, tgId),
        eq(reminders.isArchived, false),
        gte(reminders.targetTimestamp, startSec),
        lte(reminders.targetTimestamp, endSec)
      )
    )
    .orderBy(reminders.targetTimestamp)
    .all();
}

/**
 * Formats a single reminder message for Telegram
 */
export function formatReminderMessage(reminder, lang = 'fa') {
  const jalali = reminder.targetJalali || formatJalali(reminder.targetTimestamp);
  const greg = reminder.targetGregorian || formatGregorian(reminder.targetTimestamp);
  const statusStr = reminder.isCompleted
    ? (lang === 'fa' ? '✅ تکمیل شده' : '✅ Completed')
    : (lang === 'fa' ? '⏳ در انتظار' : '⏳ Pending');

  let msg = `📋 *${reminder.title}*\n`;
  if (reminder.description) {
    msg += `📝 ${reminder.description}\n`;
  }
  msg += `\n🗓 ${t('date_jalali_label', lang)} \`${jalali}\``;
  msg += `\n🗓 ${t('date_gregorian_label', lang)} \`${greg}\``;
  msg += `\n🔁 ${t('recurrence_label', lang)} ${t('recurrence_' + (reminder.recurrence || 'once'), lang)}`;
  msg += `\n⚡️ ${t('status_label', lang)} ${statusStr}`;
  return msg;
}
