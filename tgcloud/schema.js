import { table, integer, text, boolean, json, index, sql } from 'sdk/db';

/**
 * Users table
 * Stores user preferences, timezone, chosen calendar system, and multi-step dialog state.
 */
export const users = table(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tgId: integer('tg_id').unique(),
    chatId: integer('chat_id'),
    username: text('username'),
    firstName: text('first_name'),
    lastName: text('last_name'),
    lang: text('lang').default('fa'), // 'fa' | 'en'
    calendarType: text('calendar_type').default('jalali'), // 'jalali' | 'gregorian'
    timezone: text('timezone').default('Asia/Tehran'),
    isAdmin: boolean('is_admin').default(false),
    stepState: json('step_state'), // dialog state for conversational creation
    createdAt: integer('created_at').default(sql`(unixepoch())`),
    updatedAt: integer('updated_at').default(sql`(unixepoch())`),
  },
  (t) => ({
    tgIdIdx: index('idx_users_tg_id').on(t.tgId),
  })
);

/**
 * Reminders table
 * Core persistent reminder records.
 * Note: Foreign keys are not enforced by TGCloud runtime; integrity is handled in application code.
 */
export const reminders = table(
  'reminders',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull(), // tgId
    chatId: integer('chat_id').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    category: text('category').default('general'), // 'work', 'personal', 'health', 'finance', 'shopping', 'education', 'general'
    priority: text('priority').default('normal'), // 'urgent', 'high', 'normal'
    targetTimestamp: integer('target_timestamp').notNull(), // Unix epoch seconds
    targetJalali: text('target_jalali'), // formatted Jalali string
    targetGregorian: text('target_gregorian'), // formatted Gregorian string
    recurrence: text('recurrence').default('once'), // 'once', 'daily', 'weekly', 'monthly', 'yearly'
    advanceNoticeMinutes: integer('advance_notice_minutes').default(0), // 0, 5, 15, 30, 60
    isCompleted: boolean('is_completed').default(false),
    isArchived: boolean('is_archived').default(false),
    snoozeCount: integer('snooze_count').default(0),
    createdAt: integer('created_at').default(sql`(unixepoch())`),
    updatedAt: integer('updated_at').default(sql`(unixepoch())`),
  },
  (t) => ({
    userCompletedIdx: index('idx_reminders_user_completed').on(t.userId, t.isCompleted),
    targetIdx: index('idx_reminders_target').on(t.targetTimestamp),
  })
);

/**
 * Reminder Jobs queue table
 * Guarantees durable execution, atomic locking, deduplication, and failure recovery.
 */
export const reminderJobs = table(
  'reminder_jobs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    reminderId: integer('reminder_id').notNull(),
    userId: integer('user_id').notNull(),
    chatId: integer('chat_id').notNull(),
    dedupKey: text('dedup_key').unique(), // reminder_<id>_<timestamp>_<type>
    dueAt: integer('due_at').notNull(), // Unix epoch seconds
    status: text('status').default('pending'), // 'pending', 'processing', 'delivered', 'failed'
    lockedUntil: integer('locked_until').default(0), // Unix seconds lock lease
    attempts: integer('attempts').default(0),
    maxAttempts: integer('max_attempts').default(3),
    lastError: text('last_error'),
    deliveredAt: integer('delivered_at'),
    createdAt: integer('created_at').default(sql`(unixepoch())`),
  },
  (t) => ({
    statusDueIdx: index('idx_jobs_status_due').on(t.status, t.dueAt),
    dedupIdx: index('idx_jobs_dedup').on(t.dedupKey),
  })
);

/**
 * Delivery logs table for auditing, diagnostics, and reliability history.
 */
export const deliveryLogs = table(
  'delivery_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    jobId: integer('job_id'),
    reminderId: integer('reminder_id').notNull(),
    userId: integer('user_id').notNull(),
    status: text('status').notNull(), // 'success', 'failed'
    messageId: integer('message_id'),
    errorDetails: text('error_details'),
    createdAt: integer('created_at').default(sql`(unixepoch())`),
  },
  (t) => ({
    reminderIdx: index('idx_logs_reminder').on(t.reminderId),
    userIdx: index('idx_logs_user').on(t.userId),
  })
);

/**
 * Global bot configuration and settings (e.g. forced join channels, announcement flags)
 */
export const botSettings = table(
  'bot_settings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    key: text('key').unique(),
    value: text('value'),
    updatedAt: integer('updated_at').default(sql`(unixepoch())`),
  },
  (t) => ({
    keyIdx: index('idx_settings_key').on(t.key),
  })
);
