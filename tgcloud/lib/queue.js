import { db, api, BotApiError } from 'sdk';
import { eq, and, or, lt, lte, asc, sql } from 'sdk/db';
import { reminders, reminderJobs, deliveryLogs, users } from '../schema.js';
import { formatJalali, formatGregorian, calculateNextRecurrence } from './dates.js';
import { getNotificationKeyboard } from './keyboards.js';
import { t } from './i18n.js';

/**
 * Creates or schedules a delivery job for a reminder.
 * Strict deduplication by dedupKey ensures identical triggers are never queued twice.
 */
export async function scheduleJobForReminder(reminder) {
  const dedupKey = `rem_${reminder.id}_${reminder.targetTimestamp}`;
  
  await db.insert(reminderJobs).values({
    reminderId: reminder.id,
    userId: reminder.userId,
    chatId: reminder.chatId,
    dedupKey,
    dueAt: reminder.targetTimestamp,
    status: 'pending',
    attempts: 0,
    maxAttempts: 3,
    lockedUntil: 0,
  }).onConflictDoNothing({ target: reminderJobs.dedupKey }).run();
}

/**
 * Core persistent queue processor.
 * Scans for due jobs, locks them with a lease timeout, delivers Telegram messages,
 * handles failures gracefully, and computes next recurrence if applicable.
 */
export async function processDueReminders(batchLimit = 25) {
  const now = Math.floor(Date.now() / 1000);
  const leaseSeconds = 120; // 2 minutes worker lock
  // Proactive dispatch lookahead (15s): ensures reminders scheduled for XX:XX:00
  // are picked up and arrive on user's device right as the minute turns,
  // preventing deliveries from slipping into the subsequent minute.
  const dueCutoff = now + 15;

  // Find due pending jobs or stale locked jobs whose lock expired
  const dueJobs = await db.select()
    .from(reminderJobs)
    .where(
      and(
        lte(reminderJobs.dueAt, dueCutoff),
        or(
          eq(reminderJobs.status, 'pending'),
          and(
            eq(reminderJobs.status, 'processing'),
            lt(reminderJobs.lockedUntil, now)
          )
        ),
        lt(reminderJobs.attempts, reminderJobs.maxAttempts)
      )
    )
    .orderBy(asc(reminderJobs.dueAt))
    .limit(batchLimit)
    .all();

  const results = {
    totalChecked: dueJobs.length,
    delivered: 0,
    failed: 0,
    skipped: 0
  };

  for (const job of dueJobs) {
    // 1. Acquire atomic lease lock
    const lockResult = await db.update(reminderJobs)
      .set({
        status: 'processing',
        lockedUntil: now + leaseSeconds,
        attempts: job.attempts + 1,
      })
      .where(
        and(
          eq(reminderJobs.id, job.id),
          or(
            eq(reminderJobs.status, 'pending'),
            and(
              eq(reminderJobs.status, 'processing'),
              lt(reminderJobs.lockedUntil, now)
            )
          )
        )
      )
      .run();

    if (lockResult.rowsAffected === 0) {
      // Concurrently acquired by another isolate
      results.skipped++;
      continue;
    }

    // 2. Fetch reminder details
    const reminder = await db.select()
      .from(reminders)
      .where(eq(reminders.id, job.reminderId))
      .get();

    if (!reminder || reminder.isCompleted || reminder.isArchived) {
      // Reminder was deleted or already marked completed
      await db.update(reminderJobs)
        .set({ status: 'delivered', deliveredAt: now })
        .where(eq(reminderJobs.id, job.id))
        .run();
      results.skipped++;
      continue;
    }

    // 3. Fetch user language
    const user = await db.select()
      .from(users)
      .where(eq(users.tgId, job.userId))
      .get();
    const lang = user?.lang || 'fa';

    // 4. Determine if overdue (> 5 minutes late)
    const isOverdue = (now - job.dueAt) > 300;

    // 5. Build Void Markt notification message
    const jalaliStr = reminder.targetJalali || formatJalali(reminder.targetTimestamp);
    const gregStr = reminder.targetGregorian || formatGregorian(reminder.targetTimestamp);

    let text = `${t('notification_header', lang)}\n`;
    if (reminder.priority === 'urgent') {
      text += `🔴 *[هشدار فوری - تکرار هر ۵ دقیقه تا تایید شما]* 🚨\n`;
    } else if (reminder.priority === 'high') {
      text += `🟡 *[یادآوری با اولویت بالا]* ⚠️\n`;
    }
    if (isOverdue) {
      text += `${t('overdue_badge', lang)}\n`;
    }
    text += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📌 *${escapeMarkdown(reminder.title)}*\n`;
    if (reminder.description) {
      text += `📝 ${escapeMarkdown(reminder.description)}\n`;
    }
    text += `\n🗓 ${t('date_jalali_label', lang)} \`${jalaliStr}\``;
    text += `\n🗓 ${t('date_gregorian_label', lang)} \`${gregStr}\``;
    if (reminder.recurrence && reminder.recurrence !== 'once') {
      text += `\n🔁 ${t('recurrence_label', lang)} ${t('recurrence_' + reminder.recurrence, lang)}`;
    }
    text += `\n━━━━━━━━━━━━━━━━━━━━`;

    // 6. Send via Telegram Bot API
    try {
      const sentMsg = await api.sendMessage({
        chat_id: job.chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: getNotificationKeyboard(reminder.id, lang),
      });

      // 7. Record success log
      await db.insert(deliveryLogs).values({
        jobId: job.id,
        reminderId: reminder.id,
        userId: job.userId,
        status: 'success',
        messageId: sentMsg.message_id,
        errorDetails: null,
      }).run();

      // 8. Mark job delivered
      await db.update(reminderJobs)
        .set({
          status: 'delivered',
          deliveredAt: now,
        })
        .where(eq(reminderJobs.id, job.id))
        .run();

      // 8.1. For urgent priority: if still not completed, schedule a repeat alert in 5 minutes
      if (reminder.priority === 'urgent' && !reminder.isCompleted && !reminder.isArchived) {
        const nagDue = now + 5 * 60; // 5 minutes later
        const nagKey = `rem_${reminder.id}_nag_${nagDue}`;
        await db.insert(reminderJobs).values({
          reminderId: reminder.id,
          userId: reminder.userId,
          chatId: reminder.chatId,
          dedupKey: nagKey,
          dueAt: nagDue,
          status: 'pending',
          attempts: 0,
          maxAttempts: 12, // Nag up to 1 hour (12 times)
          lockedUntil: 0,
        }).onConflictDoNothing({ target: reminderJobs.dedupKey }).run();
      }

      // 9. If recurring, schedule the next occurrence
      if (reminder.recurrence && reminder.recurrence !== 'once') {
        const nextTimestamp = calculateNextRecurrence(reminder.targetTimestamp, reminder.recurrence);
        if (nextTimestamp) {
          const nextJalali = formatJalali(nextTimestamp);
          const nextGregorian = formatGregorian(nextTimestamp);

          await db.update(reminders)
            .set({
              targetTimestamp: nextTimestamp,
              targetJalali: nextJalali,
              targetGregorian: nextGregorian,
              updatedAt: now,
            })
            .where(eq(reminders.id, reminder.id))
            .run();

          await scheduleJobForReminder({
            id: reminder.id,
            userId: reminder.userId,
            chatId: reminder.chatId,
            targetTimestamp: nextTimestamp,
          });
        }
      } else {
        // One-time reminder marked completed
        await db.update(reminders)
          .set({ isCompleted: true, updatedAt: now })
          .where(eq(reminders.id, reminder.id))
          .run();
      }

      results.delivered++;
    } catch (err) {
      console.error(`[queue] Delivery failed for job ${job.id}:`, err);
      const isFatal = (job.attempts + 1) >= job.maxAttempts;

      await db.update(reminderJobs)
        .set({
          status: isFatal ? 'failed' : 'pending',
          lockedUntil: 0,
          lastError: err?.message || String(err),
        })
        .where(eq(reminderJobs.id, job.id))
        .run();

      await db.insert(deliveryLogs).values({
        jobId: job.id,
        reminderId: reminder.id,
        userId: job.userId,
        status: 'failed',
        messageId: null,
        errorDetails: err?.message || String(err),
      }).run();

      results.failed++;
    }
  }

  return results;
}

function escapeMarkdown(text) {
  if (!text) return '';
  return String(text).replace(/([_*[\]()~`>#+=|{}.!-])/g, '\\$1');
}
