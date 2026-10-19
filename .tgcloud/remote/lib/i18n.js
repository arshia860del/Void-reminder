/**
 * Internationalization and professional public-facing brand copy.
 * Tailored for wide public adoption (انتشار عمومی), natural tone, and no internal technical jargon.
 */

export const STRINGS = {
  fa: {
    brand_title: '🪐 یادآور The Void Markt',
    brand_subtitle: 'دستیار دقیق و هوشمند مدیریت یادآورها و کارهای روزانه',
    welcome: `سلام! به **The Void Markt** خوش آمدید. ✨

من اینجام تا کمکتون کنم هیچ برنامه، کار مهم یا قرار ملاقاتی رو از دست ندید. تمام یادآوری‌ها با دقت ثانیه و بر اساس تقویم شمسی یا میلادی سر وقت برای شما ارسال می‌شن.

چه کاری می‌تونم براتون انجام بدم؟`,
    btn_new_reminder: '➕ یادآور جدید',
    btn_list_reminders: '📋 یادآورهای من',
    btn_today: '📅 برنامه امروز',
    btn_open_miniapp: '🌐 باز کردن برنامه (Mini App)',
    btn_settings: '⚙️ تنظیمات و تقویم',
    btn_help: 'ℹ️ راهنما',

    // Reminder creation steps
    prompt_enter_title: '✏️ عنوان کاری که می‌خواهید به شما یادآوری شود را بنویسید:\n(مثال: تماس با پشتیبانی، پرداخت قبض، جلسه کاری)',
    prompt_enter_date: '📅 تاریخ مورد نظرتان را انتخاب کنید یا به صورت تاریخ شمسی بفرستید (مثال: 1405/08/15):',
    prompt_enter_time: '⏰ ساعت یادآوری را وارد کنید (مثال: 14:30 یا 09:00):',
    prompt_select_recurrence: '🔁 آیا این یادآوری نیاز به تکرار دوره‌ای دارد؟',

    recurrence_once: 'یک‌باره (بدون تکرار)',
    recurrence_daily: 'روزانه (هر روز)',
    recurrence_weekly: 'هفتگی (هر هفته)',
    recurrence_monthly: 'ماهانه (هر ماه)',
    recurrence_yearly: 'سالانه (هر سال)',

    reminder_created_success: '✅ یادآور شما با موفقیت ثبت و زمان‌بندی شد.',
    reminder_details_header: '📋 مشخصات یادآور:',
    title_label: '📌 عنوان:',
    date_jalali_label: '🗓 تاریخ:',
    date_gregorian_label: '🗓 تاریخ میلادی:',
    recurrence_label: '🔁 دوره‌ی تکرار:',
    status_label: '⚡️ وضعیت:',

    // Notification delivery
    notification_header: '🔔 وقت یادآوری فرا رسید!',
    overdue_badge: '⚠️ [یادآوری با تاخیر]',
    btn_done: '✅ انجام شد',
    btn_snooze_15m: '💤 ۱۵ دقیقه بعد',
    btn_snooze_1h: '💤 ۱ ساعت بعد',
    btn_snooze_1d: '💤 فردا همین موقع',
    btn_delete: '🗑 حذف',

    action_completed: '✅ به عنوان انجام شده ثبت شد.',
    action_snoozed: '💤 برای شما به تعویق افتاد و دوباره یادآوری خواهد شد.',
    action_deleted: '🗑 یادآور با موفقیت حذف شد.',

    empty_list: '📭 شما در حال حاضر یادآور فعالی ندارید.\nبرای ثبت کار جدید روی «➕ یادآور جدید» کلیک کنید.',
    today_empty: '✨ برای امروز هیچ برنامه یا یادآوری تنظیم نشده است.',

    settings_header: '⚙️ تنظیمات شخصی شما:',
    calendar_jalali_selected: 'تقویم فعال: شمسی (خورشیدی)',
    calendar_greg_selected: 'تقویم فعال: میلادی (Gregorian)',
    btn_switch_calendar: '🔄 تغییر تقویم (شمسی / میلادی)',
    btn_switch_lang: '🌐 Switch to English',

    // Admin copy
    admin_access_denied: '⛔️ شما دسترسی مدیریت این ربات را ندارید.',
    admin_welcome: '👑 **پنل مدیریت پیشرفته The Void Markt**',
  },

  en: {
    brand_title: '🪐 The Void Markt Reminder',
    brand_subtitle: 'Intelligent, reliable task and schedule assistant',
    welcome: `Welcome to **The Void Markt**! ✨

I am here to ensure you never miss any meeting, task, or important deadline. All reminders are delivered with minute precision.

How can I help you today?`,
    btn_new_reminder: '➕ New Reminder',
    btn_list_reminders: '📋 My Reminders',
    btn_today: '📅 Today\'s Agenda',
    btn_open_miniapp: '🌐 Open Mini App',
    btn_settings: '⚙️ Settings',
    btn_help: 'ℹ️ Help',

    prompt_enter_title: '✏️ Please enter what you would like to be reminded of:\n(e.g., Doctor appointment, Renew subscription)',
    prompt_enter_date: '📅 Choose the date or type it in (e.g. 2026-10-25):',
    prompt_enter_time: '⏰ Enter the time in 24h format (e.g. 14:30 or 09:00):',
    prompt_select_recurrence: '🔁 Does this reminder need to repeat?',

    recurrence_once: 'Once (No repeat)',
    recurrence_daily: 'Daily',
    recurrence_weekly: 'Weekly',
    recurrence_monthly: 'Monthly',
    recurrence_yearly: 'Yearly',

    reminder_created_success: '✅ Reminder scheduled successfully.',
    reminder_details_header: '📋 Reminder Details:',
    title_label: '📌 Title:',
    date_jalali_label: '🗓 Date:',
    date_gregorian_label: '🗓 Gregorian Date:',
    recurrence_label: '🔁 Recurrence:',
    status_label: '⚡️ Status:',

    notification_header: '🔔 Time for your reminder!',
    overdue_badge: '⚠️ [Overdue Notification]',
    btn_done: '✅ Mark Done',
    btn_snooze_15m: '💤 Snooze 15m',
    btn_snooze_1h: '💤 Snooze 1h',
    btn_snooze_1d: '💤 Snooze 1 Day',
    btn_delete: '🗑 Delete',

    action_completed: '✅ Marked as completed.',
    action_snoozed: '💤 Snoozed successfully.',
    action_deleted: '🗑 Reminder deleted.',

    empty_list: '📭 You currently have no active reminders.',
    today_empty: '✨ No tasks or reminders scheduled for today.',

    settings_header: '⚙️ Your Preferences:',
    calendar_jalali_selected: 'Active Calendar: Jalali',
    calendar_greg_selected: 'Active Calendar: Gregorian',
    btn_switch_calendar: '🔄 Toggle Calendar System',
    btn_switch_lang: '🌐 تغییر به فارسی',

    admin_access_denied: '⛔️ Access denied. Admin privileges required.',
    admin_welcome: '👑 **The Void Markt Admin Control Center**',
  }
};

export function t(key, lang = 'fa') {
  const dict = STRINGS[lang] || STRINGS.fa;
  return dict[key] || STRINGS.fa[key] || key;
}
