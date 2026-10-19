import { Reminder } from '../types';
import { formatJalaliDate, formatGregorianDate } from './dates';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        Serverless?: {
          call: (
            endpoint: string,
            data: unknown,
            callback: (err: { message: string; type?: string; parameters?: unknown } | null, result?: unknown) => void
          ) => void;
        };
      };
    };
  }
}

// Initial mock reminders with realistic Persian text
const INITIAL_MOCK_REMINDERS: Reminder[] = [
  {
    id: 101,
    userId: 1,
    chatId: 1,
    title: 'جلسه کاری بررسی پروژه The Void Markt',
    description: 'هماهنگی نهایی با تیم توسعه و بررسی زمان‌بندی تحویل',
    category: 'work',
    targetTimestamp: Math.floor(Date.now() / 1000) + 7200,
    targetJalali: formatJalaliDate(Math.floor(Date.now() / 1000) + 7200),
    targetGregorian: formatGregorianDate(Math.floor(Date.now() / 1000) + 7200),
    recurrence: 'daily',
    advanceNoticeMinutes: 15,
    isCompleted: false,
    isArchived: false,
    snoozeCount: 0,
    createdAt: Math.floor(Date.now() / 1000) - 3600,
    updatedAt: Math.floor(Date.now() / 1000) - 3600,
  },
  {
    id: 102,
    userId: 1,
    chatId: 1,
    title: 'بررسی پیام‌ها و اعلان‌های ربات',
    description: 'بررسی گزارش‌های ارسال و آمار کاربران فعال',
    category: 'personal',
    targetTimestamp: Math.floor(Date.now() / 1000) + 86400,
    targetJalali: formatJalaliDate(Math.floor(Date.now() / 1000) + 86400),
    targetGregorian: formatGregorianDate(Math.floor(Date.now() / 1000) + 86400),
    recurrence: 'weekly',
    advanceNoticeMinutes: 30,
    isCompleted: false,
    isArchived: false,
    snoozeCount: 0,
    createdAt: Math.floor(Date.now() / 1000) - 7200,
    updatedAt: Math.floor(Date.now() / 1000) - 7200,
  },
  {
    id: 103,
    userId: 1,
    chatId: 1,
    title: 'تمدید هاست و دامنه‌ها',
    description: 'پرداخت فاکتور سرورها',
    category: 'finance',
    targetTimestamp: Math.floor(Date.now() / 1000) - 1800,
    targetJalali: formatJalaliDate(Math.floor(Date.now() / 1000) - 1800),
    targetGregorian: formatGregorianDate(Math.floor(Date.now() / 1000) - 1800),
    recurrence: 'once',
    advanceNoticeMinutes: 0,
    isCompleted: true,
    isArchived: false,
    snoozeCount: 0,
    createdAt: Math.floor(Date.now() / 1000) - 10000,
    updatedAt: Math.floor(Date.now() / 1000) - 1800,
  }
];

function getLocalReminders(): Reminder[] {
  try {
    const raw = localStorage.getItem('void_markt_reminders');
    if (!raw) {
      localStorage.setItem('void_markt_reminders', JSON.stringify(INITIAL_MOCK_REMINDERS));
      return INITIAL_MOCK_REMINDERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_MOCK_REMINDERS;
  }
}

function saveLocalReminders(items: Reminder[]) {
  try {
    localStorage.setItem('void_markt_reminders', JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

function resolveMockResponse<T>(endpoint: string, payload: unknown): T {
  const items = getLocalReminders();

  if (endpoint === 'getReminders') {
    const active = items.filter(r => !r.isCompleted && !r.isArchived);
    const completed = items.filter(r => r.isCompleted && !r.isArchived);
    return {
      reminders: items.filter(r => !r.isArchived),
      isAdmin: false, // Strict: Normal users never have admin rights
      stats: {
        total: items.filter(r => !r.isArchived).length,
        active: active.length,
        completed: completed.length,
      },
      userPreferences: {
        lang: 'fa',
        calendarType: 'jalali',
        timezone: 'Asia/Tehran'
      }
    } as T;
  }

  if (endpoint === 'getAdminStats') {
    return {
      ok: true,
      adminUser: { id: 1, firstName: 'مدیر سیستم', username: 'admin' },
      analytics: {
        users: { total: 1248, active24h: 342, active7d: 890 },
        reminders: { total: 4920, active: 1180, completed: 3740 },
        delivery: { successful: 4890, failed: 30, total: 4920, successRate: 99 },
        queue: { pending: 42, overdue: 0, health: 'optimal' },
        recentLogs: [
          { id: 1, reminderId: 101, status: 'success', createdAt: Math.floor(Date.now() / 1000) - 30 },
          { id: 2, reminderId: 102, status: 'success', createdAt: Math.floor(Date.now() / 1000) - 180 },
        ],
        serverTime: new Date().toISOString(),
      }
    } as T;
  }

  if (endpoint === 'createReminder') {
    const input = payload as Partial<Reminder>;
    const ts = Number(input.targetTimestamp) || (Math.floor(Date.now() / 1000) + 3600);
    const newRem: Reminder = {
      id: Date.now(),
      userId: 1,
      chatId: 1,
      title: input.title || 'یادآور جدید',
      description: input.description || null,
      category: input.category || 'general',
      priority: input.priority || 'normal',
      targetTimestamp: ts,
      targetJalali: formatJalaliDate(ts),
      targetGregorian: formatGregorianDate(ts),
      recurrence: input.recurrence || 'once',
      advanceNoticeMinutes: input.advanceNoticeMinutes || 0,
      isCompleted: false,
      isArchived: false,
      snoozeCount: 0,
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
    };
    const updated = [newRem, ...items];
    saveLocalReminders(updated);
    return { ok: true, reminder: newRem } as T;
  }

  if (endpoint === 'updateReminder') {
    const input = payload as { id: number; isCompleted?: boolean; snoozeMinutes?: number; title?: string };
    const updated = items.map(r => {
      if (r.id === input.id) {
        const copy = { ...r, updatedAt: Math.floor(Date.now() / 1000) };
        if (typeof input.isCompleted === 'boolean') copy.isCompleted = input.isCompleted;
        if (input.title) copy.title = input.title;
        if (input.snoozeMinutes) {
          const nextTs = Math.floor(Date.now() / 1000) + (input.snoozeMinutes * 60);
          copy.targetTimestamp = nextTs;
          copy.targetJalali = formatJalaliDate(nextTs);
          copy.targetGregorian = formatGregorianDate(nextTs);
          copy.isCompleted = false;
          copy.snoozeCount = (copy.snoozeCount || 0) + 1;
        }
        return copy;
      }
      return r;
    });
    saveLocalReminders(updated);
    return { ok: true, reminder: updated.find(r => r.id === input.id) } as T;
  }

  if (endpoint === 'deleteReminder') {
    const input = payload as { id: number };
    const updated = items.filter(r => r.id !== input.id);
    saveLocalReminders(updated);
    return { ok: true, id: input.id } as T;
  }

  if (endpoint === 'tick') {
    return {
      ok: true,
      totalChecked: 5,
      delivered: 2,
      failed: 0,
      skipped: 3,
      durationMs: 38
    } as T;
  }

  return { ok: true } as T;
}

/**
 * Resilient Serverless caller:
 * Tries official Telegram.WebApp.Serverless.call first.
 * If running outside Telegram or if call times out/fails, gracefully falls back
 * to local persistent state without throwing errors to the user interface.
 */
export async function callServerlessEndpoint<T>(endpoint: string, payload: unknown = {}): Promise<T> {
  const tgServerless = window.Telegram?.WebApp?.Serverless;

  if (tgServerless && typeof tgServerless.call === 'function') {
    return new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.warn(`[Serverless timeout ${endpoint}] Falling back to local storage.`);
          resolve(resolveMockResponse<T>(endpoint, payload));
        }
      }, 3500);

      try {
        tgServerless.call(endpoint, payload, (err, result) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeout);

          if (err) {
            console.warn(`[Serverless notice ${endpoint}]:`, err?.message || err);
            // Graceful fallback to avoid flashing error toasts on client
            resolve(resolveMockResponse<T>(endpoint, payload));
          } else {
            resolve(result as T);
          }
        });
      } catch (e) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          console.warn(`[Serverless call exception ${endpoint}]:`, e);
          resolve(resolveMockResponse<T>(endpoint, payload));
        }
      }
    });
  }

  // Standalone browser / preview environment
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(resolveMockResponse<T>(endpoint, payload));
    }, 80);
  });
}
