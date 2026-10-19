import { t } from './i18n.js';

/**
 * Builds inline keyboards for Telegram chat interactions.
 * Adheres to The Void Markt clean, structured layout.
 */

export function getMainMenuKeyboard(lang = 'fa', miniAppUrl = '') {
  const keyboard = [
    [
      { text: t('btn_new_reminder', lang), callback_data: 'menu:new' },
      { text: t('btn_list_reminders', lang), callback_data: 'menu:list' }
    ],
    [
      { text: t('btn_today', lang), callback_data: 'menu:today' },
      { text: t('btn_settings', lang), callback_data: 'menu:settings' }
    ]
  ];

  if (miniAppUrl) {
    keyboard.push([
      { text: t('btn_open_miniapp', lang), web_app: { url: miniAppUrl } }
    ]);
  }

  return { inline_keyboard: keyboard };
}

export function getDateQuickKeyboard(lang = 'fa') {
  return {
    inline_keyboard: [
      [
        { text: lang === 'fa' ? 'امروز' : 'Today', callback_data: 'date:today' },
        { text: lang === 'fa' ? 'فردا' : 'Tomorrow', callback_data: 'date:tomorrow' },
        { text: lang === 'fa' ? 'پس‌فردا' : 'In 2 days', callback_data: 'date:in2days' },
      ],
      [
        { text: lang === 'fa' ? 'آخر هفته' : 'Weekend', callback_data: 'date:weekend' },
        { text: lang === 'fa' ? 'هفته آینده' : 'Next week', callback_data: 'date:nextweek' },
      ],
      [
        { text: lang === 'fa' ? '🔙 لغو' : '🔙 Cancel', callback_data: 'menu:cancel' }
      ]
    ]
  };
}

export function getRecurrenceKeyboard(lang = 'fa') {
  return {
    inline_keyboard: [
      [{ text: t('recurrence_once', lang), callback_data: 'recurrence:once' }],
      [{ text: t('recurrence_daily', lang), callback_data: 'recurrence:daily' }],
      [{ text: t('recurrence_weekly', lang), callback_data: 'recurrence:weekly' }],
      [{ text: t('recurrence_monthly', lang), callback_data: 'recurrence:monthly' }],
      [{ text: t('recurrence_yearly', lang), callback_data: 'recurrence:yearly' }],
      [{ text: lang === 'fa' ? '🔙 لغو' : '🔙 Cancel', callback_data: 'menu:cancel' }]
    ]
  };
}

export function getReminderActionKeyboard(reminderId, lang = 'fa') {
  return {
    inline_keyboard: [
      [
        { text: t('btn_done', lang), callback_data: `rem_done:${reminderId}` },
        { text: '💤 تعویق', callback_data: `rem_snooze_menu:${reminderId}` }
      ],
      [
        { text: t('btn_delete', lang), callback_data: `rem_del:${reminderId}` },
        { text: lang === 'fa' ? '🔙 لیست' : '🔙 List', callback_data: 'menu:list' }
      ]
    ]
  };
}

export function getNotificationKeyboard(reminderId, lang = 'fa') {
  return {
    inline_keyboard: [
      [
        { text: t('btn_done', lang), callback_data: `rem_done:${reminderId}` },
        { text: t('btn_snooze_15m', lang), callback_data: `rem_snooze:${reminderId}:15` }
      ],
      [
        { text: t('btn_snooze_1h', lang), callback_data: `rem_snooze:${reminderId}:60` },
        { text: t('btn_snooze_1d', lang), callback_data: `rem_snooze:${reminderId}:1440` }
      ]
    ]
  };
}

export function getSettingsKeyboard(currentCal = 'jalali', currentLang = 'fa') {
  return {
    inline_keyboard: [
      [
        {
          text: currentCal === 'jalali' ? '🗓 تغییر به تقویم میلادی' : '🗓 تغییر به تقویم شمسی',
          callback_data: 'set_cal:toggle'
        }
      ],
      [
        {
          text: currentLang === 'fa' ? '🌐 Switch to English' : '🌐 تغییر به فارسی',
          callback_data: 'set_lang:toggle'
        }
      ],
      [
        { text: currentLang === 'fa' ? '🔙 بازگشت به منو' : '🔙 Back to Menu', callback_data: 'menu:main' }
      ]
    ]
  };
}
