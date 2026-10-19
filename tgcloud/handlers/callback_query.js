import { api, db } from 'sdk';
import { eq, and } from 'sdk/db';
import { users, reminders } from '../schema.js';
import { getOrCreateUser, getUserReminders, getTodayReminders, formatReminderMessage } from '../lib/bot.js';
import { formatJalali, formatGregorian, gregorianToJalali, getTimezoneOffsetMinutes } from '../lib/dates.js';
import { getMainMenuKeyboard, getReminderActionKeyboard, getSettingsKeyboard } from '../lib/keyboards.js';
import { scheduleJobForReminder, processDueReminders } from '../lib/queue.js';
import { isUserAdmin, getSystemAnalytics } from '../lib/admin.js';
import { verifyUserMembership, getForceJoinKeyboard, getForceJoinMessage } from '../lib/forceJoin.js';
import { getForceJoinConfig, setForceJoinConfig } from '../lib/settings.js';
import { executeBroadcast } from '../lib/broadcast.js';
import { t } from '../lib/i18n.js';

export default async function (query, ctx) {
  if (!query || !query.data || !query.message) return;

  const data = query.data;
  const message = query.message;
  const chat = message.chat;
  const fromUser = query.from;

  // Opportunistic queue trigger
  try {
    await processDueReminders(10);
  } catch (err) {
    console.error('[callback-handler] Queue error:', err);
  }

  const user = await getOrCreateUser(fromUser, chat);
  const lang = user.lang || 'fa';
  const tz = user.timezone || 'Asia/Tehran';

  // 1. Force Join Verification Callback
  if (data === 'check_force_join') {
    const check = await verifyUserMembership(fromUser.id);
    if (check.isMember) {
      await api.answerCallbackQuery({
        callback_query_id: query.id,
        text: '✅ عضویت شما تایید شد! خوش آمدید.',
      });
      await api.sendMessage({
        chat_id: chat.id,
        text: `🎉 *عضویت شما با موفقیت تایید شد!*\n\n${t('welcome', lang)}`,
        parse_mode: 'Markdown',
        reply_markup: getMainMenuKeyboard(lang),
      });
    } else {
      await api.answerCallbackQuery({
        callback_query_id: query.id,
        text: '❌ شما هنوز در کانال عضو نشده‌اید! لطفاً ابتدا در کانال عضو شده و سپس مجدداً این دکمه را لمس کنید.',
        show_alert: true,
      });
    }
    return;
  }

  // 2. Global Force Join Gate for non-admin interactions
  const membership = await verifyUserMembership(fromUser.id);
  if (!membership.isMember && !data.startsWith('admin:')) {
    await api.answerCallbackQuery({
      callback_query_id: query.id,
      text: '🔒 برای دسترسی به ربات ابتدا در کانال عضو شوید!',
      show_alert: true,
    });
    await api.sendMessage({
      chat_id: chat.id,
      text: getForceJoinMessage(membership.config.channel, membership.config.title),
      parse_mode: 'Markdown',
      reply_markup: getForceJoinKeyboard(membership.config.channel),
    });
    return;
  }

  // 3. Navigation and Main Menu actions
  if (data === 'menu:main') {
    await db.update(users).set({ stepState: null }).where(eq(users.id, user.id)).run();
    await api.editMessageText({
      chat_id: chat.id,
      message_id: message.message_id,
      text: `${t('brand_title', lang)}\n\n${t('welcome', lang)}`,
      parse_mode: 'Markdown',
      reply_markup: getMainMenuKeyboard(lang),
    });
    await api.answerCallbackQuery({ callback_query_id: query.id });
    return;
  }

  if (data === 'menu:new') {
    await db.update(users)
      .set({ stepState: { step: 'awaiting_title' } })
      .where(eq(users.id, user.id))
      .run();

    await api.sendMessage({
      chat_id: chat.id,
      text: `${t('brand_title', lang)}\n\n${t('prompt_enter_title', lang)}`,
      parse_mode: 'Markdown',
    });
    await api.answerCallbackQuery({ callback_query_id: query.id });
    return;
  }

  if (data === 'menu:list') {
    const items = await getUserReminders(user.id);
    if (items.length === 0) {
      await api.answerCallbackQuery({ callback_query_id: query.id, text: t('no_reminders', lang) });
      await api.sendMessage({
        chat_id: chat.id,
        text: t('no_reminders', lang),
        reply_markup: getMainMenuKeyboard(lang),
      });
      return;
    }

    let responseText = `${t('brand_title', lang)}\n\n📋 *${t('btn_list_reminders', lang)}:*\n\n`;
    items.forEach((item, i) => {
      const dateStr = user.calendarType === 'gregorian'
        ? (item.targetGregorian || '')
        : (item.targetJalali || '');
      responseText += `${i + 1}. *${item.title}*\n   🗓 \`${dateStr}\` | /view_${item.id}\n\n`;
    });

    await api.sendMessage({
      chat_id: chat.id,
      text: responseText,
      parse_mode: 'Markdown',
      reply_markup: getMainMenuKeyboard(lang),
    });
    await api.answerCallbackQuery({ callback_query_id: query.id });
    return;
  }

  if (data === 'menu:today') {
    const todayItems = await getTodayReminders(user.id, tz);
    if (todayItems.length === 0) {
      await api.answerCallbackQuery({ callback_query_id: query.id, text: t('no_reminders_today', lang) });
      await api.sendMessage({
        chat_id: chat.id,
        text: `📅 ${t('no_reminders_today', lang)}`,
        reply_markup: getMainMenuKeyboard(lang),
      });
      return;
    }

    let msg = `📅 *برنامه یادآورهای امروز شما:*\n\n`;
    todayItems.forEach((r, idx) => {
      const timePart = (r.targetJalali || '').split(' ')[1] || '';
      msg += `${idx + 1}. ⏰ *${timePart}* - *${r.title}*\n   /view_${r.id}\n\n`;
    });

    await api.sendMessage({
      chat_id: chat.id,
      text: msg,
      parse_mode: 'Markdown',
      reply_markup: getMainMenuKeyboard(lang),
    });
    await api.answerCallbackQuery({ callback_query_id: query.id });
    return;
  }

  if (data === 'menu:settings') {
    const calName = user.calendarType === 'jalali' ? t('calendar_jalali_selected', lang) : t('calendar_greg_selected', lang);
    await api.sendMessage({
      chat_id: chat.id,
      text: `⚙️ *تنظیمات سیستم یادآور:*\n\n• تقویم فعال: *${calName}*\n• زبان ربات: *${lang === 'fa' ? 'فارسی' : 'English'}*\n• منطقه زمانی: \`${tz}\``,
      parse_mode: 'Markdown',
      reply_markup: getSettingsKeyboard(user.calendarType, lang),
    });
    await api.answerCallbackQuery({ callback_query_id: query.id });
    return;
  }

  // 4. Quick Date Selection for New Reminder
  if (data.startsWith('date:')) {
    const choice = data.replace('date:', '');
    const now = new Date();
    let offsetDays = 0;

    if (choice === 'today') offsetDays = 0;
    else if (choice === 'tomorrow') offsetDays = 1;
    else if (choice === 'in2days') offsetDays = 2;
    else if (choice === 'weekend') offsetDays = 4;
    else if (choice === 'nextweek') offsetDays = 7;

    const tzOffsetMs = getTimezoneOffsetMinutes(tz) * 60 * 1000;
    const targetDate = new Date(now.getTime() + tzOffsetMs + offsetDays * 86400 * 1000);
    const pad = (n) => String(n).padStart(2, '0');

    let dateText = '';
    if (user.calendarType === 'jalali') {
      const { jy, jm, jd } = gregorianToJalali(
        targetDate.getUTCFullYear(),
        targetDate.getUTCMonth() + 1,
        targetDate.getUTCDate()
      );
      dateText = `${jy}/${pad(jm)}/${pad(jd)}`;
    } else {
      dateText = `${targetDate.getUTCFullYear()}-${pad(targetDate.getUTCMonth() + 1)}-${pad(targetDate.getUTCDate())}`;
    }

    await db.update(users)
      .set({
        stepState: {
          ...(user.stepState || {}),
          step: 'awaiting_time',
          dateText,
        }
      })
      .where(eq(users.id, user.id))
      .run();

    await api.answerCallbackQuery({ callback_query_id: query.id, text: `تاریخ: ${dateText}` });
    await api.sendMessage({
      chat_id: chat.id,
      text: `🗓 تاریخ انتخاب شده: \`${dateText}\`\n\n${t('prompt_enter_time', lang)}`,
      parse_mode: 'Markdown',
    });
    return;
  }

  // 5. Recurrence Selection
  if (data.startsWith('recur:')) {
    const recurrence = data.replace('recur:', '');
    const stepState = user.stepState;
    if (!stepState || !stepState.title || !stepState.targetTimestamp) {
      await api.answerCallbackQuery({ callback_query_id: query.id, text: 'اطلاعات ناقص است' });
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const newRem = await db.insert(reminders)
      .values({
        userId: user.id,
        chatId: chat.id,
        title: stepState.title,
        description: stepState.description || null,
        category: 'general',
        targetTimestamp: stepState.targetTimestamp,
        targetJalali: stepState.targetJalali,
        targetGregorian: stepState.targetGregorian,
        recurrence,
        isCompleted: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    await scheduleJobForReminder(newRem);

    await db.update(users).set({ stepState: null }).where(eq(users.id, user.id)).run();

    await api.answerCallbackQuery({ callback_query_id: query.id, text: '✅ ذخیره شد' });
    const successMsg = `${t('reminder_created_success', lang)}\n\n${formatReminderMessage(newRem, lang)}`;
    await api.sendMessage({
      chat_id: chat.id,
      text: successMsg,
      parse_mode: 'Markdown',
      reply_markup: getReminderActionKeyboard(newRem.id, lang),
    });
    return;
  }

  // 6. Reminder Actions: Done, Delete, Snooze
  if (data.startsWith('rem_done:')) {
    const remId = parseInt(data.replace('rem_done:', ''), 10);
    const now = Math.floor(Date.now() / 1000);
    await db.update(reminders)
      .set({ isCompleted: true, updatedAt: now })
      .where(and(eq(reminders.id, remId), eq(reminders.userId, user.id)))
      .run();

    await api.answerCallbackQuery({ callback_query_id: query.id, text: '✅ وضعیت به انجام شده تغییر یافت' });
    await api.editMessageText({
      chat_id: chat.id,
      message_id: message.message_id,
      text: `✅ این یادآور با موفقیت *تکمیل شد*.`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 بازگشت به لیست', callback_data: 'menu:list' }]]
      }
    });
    return;
  }

  if (data.startsWith('rem_del:')) {
    const remId = parseInt(data.replace('rem_del:', ''), 10);
    const now = Math.floor(Date.now() / 1000);
    await db.update(reminders)
      .set({ isArchived: true, updatedAt: now })
      .where(and(eq(reminders.id, remId), eq(reminders.userId, user.id)))
      .run();

    await api.answerCallbackQuery({ callback_query_id: query.id, text: '🗑 یادآور حذف شد' });
    await api.editMessageText({
      chat_id: chat.id,
      message_id: message.message_id,
      text: `🗑 یادآور با موفقیت حذف گردید.`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 بازگشت به لیست', callback_data: 'menu:list' }]]
      }
    });
    return;
  }

  if (data.startsWith('rem_snooze_menu:')) {
    const remId = parseInt(data.replace('rem_snooze_menu:', ''), 10);
    await api.editMessageReplyMarkup({
      chat_id: chat.id,
      message_id: message.message_id,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '+۱۵ دقیقه', callback_data: `rem_snooze:${remId}:15` },
            { text: '+۱ ساعت', callback_data: `rem_snooze:${remId}:60` },
            { text: '+۱ روز', callback_data: `rem_snooze:${remId}:1440` }
          ],
          [{ text: '🔙 بازگشت', callback_data: `rem_cancel_snooze:${remId}` }]
        ]
      }
    });
    await api.answerCallbackQuery({ callback_query_id: query.id });
    return;
  }

  if (data.startsWith('rem_snooze:')) {
    const [, remIdStr, minsStr] = data.split(':');
    const remId = parseInt(remIdStr, 10);
    const minutes = parseInt(minsStr, 10);
    const now = Math.floor(Date.now() / 1000);
    const newTarget = now + minutes * 60;

    const jStr = formatJalali(newTarget, true, tz);
    const gStr = formatGregorian(newTarget, true, tz);

    const updated = await db.update(reminders)
      .set({
        targetTimestamp: newTarget,
        targetJalali: jStr,
        targetGregorian: gStr,
        isCompleted: false,
        updatedAt: now,
      })
      .where(and(eq(reminders.id, remId), eq(reminders.userId, user.id)))
      .returning()
      .get();

    if (updated) {
      await scheduleJobForReminder(updated);
    }

    await api.answerCallbackQuery({ callback_query_id: query.id, text: `⏰ یادآور به مدت ${minutes} دقیقه به تعویق افتاد` });
    await api.editMessageText({
      chat_id: chat.id,
      message_id: message.message_id,
      text: `💤 یادآور به تعویق افتاد.\nزمان جدید: \`${jStr}\``,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 بازگشت به لیست', callback_data: 'menu:list' }]]
      }
    });
    return;
  }

  // 7. Settings Toggles
  if (data === 'set_cal:toggle') {
    const nextCal = user.calendarType === 'jalali' ? 'gregorian' : 'jalali';
    await db.update(users).set({ calendarType: nextCal }).where(eq(users.id, user.id)).run();

    const calName = nextCal === 'jalali' ? t('calendar_jalali_selected', lang) : t('calendar_greg_selected', lang);
    await api.editMessageText({
      chat_id: chat.id,
      message_id: message.message_id,
      text: `${t('settings_header', lang)}\n\n• ${calName}\n• زبان: ${lang === 'fa' ? 'فارسی' : 'English'}`,
      reply_markup: getSettingsKeyboard(nextCal, lang),
    });
    await api.answerCallbackQuery({ callback_query_id: query.id, text: calName });
    return;
  }

  if (data === 'set_lang:toggle') {
    const nextLang = user.lang === 'fa' ? 'en' : 'fa';
    await db.update(users).set({ lang: nextLang }).where(eq(users.id, user.id)).run();

    const calName = user.calendarType === 'jalali' ? t('calendar_jalali_selected', nextLang) : t('calendar_greg_selected', nextLang);
    await api.editMessageText({
      chat_id: chat.id,
      message_id: message.message_id,
      text: `${t('settings_header', nextLang)}\n\n• ${calName}\n• زبان: ${nextLang === 'fa' ? 'فارسی' : 'English'}`,
      reply_markup: getSettingsKeyboard(user.calendarType, nextLang),
    });
    return;
  }

  // 8. Admin Control Panel Actions
  const isAdm = await isUserAdmin(fromUser.id);

  if (data === 'admin:force_join') {
    if (!isAdm) return;
    const fj = await getForceJoinConfig();
    const text = `📢 *مدیریت جوین اجباری کانال (Mandatory Join)*\n\n` +
      `⚡️ *وضعیت قفل:* ${fj.enabled ? 'روشن و فعال ✅' : 'خاموش و غیرفعال ❌'}\n` +
      `📌 *آیدی کانال:* \`${fj.channel || 'هنوز تنطیم نشده'}\`\n` +
      `🏷 *عنوان نمایشی:* ${fj.title}\n\n` +
      `💡 وقتی قفل فعال باشد، هیچ کاربری بدون عضویت در کانال نمی‌تواند از ربات استفاده کند.\n` +
      `⚠️ *نکته ضروری:* ربات باید حتماً در کانال بالا ادمین باشد تا بتواند عضویت کاربر را تایید کند.`;

    await api.editMessageText({
      chat_id: chat.id,
      message_id: message.message_id,
      text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: fj.enabled ? '🔴 خاموش کردن قفل اجباری' : '🟢 روشن کردن قفل اجباری', callback_data: 'admin:toggle_fj' }],
          [{ text: '✏️ تغییر آیدی کانال', callback_data: 'admin:set_channel' }, { text: '🏷 تغییر نام کانال', callback_data: 'admin:set_channel_title' }],
          [{ text: '🔍 تست دسترسی و ادمین بودن ربات', callback_data: 'admin:test_channel' }],
          [{ text: '🔙 بازگشت به پنل اصلی مدیریت', callback_data: 'admin:refresh' }]
        ]
      }
    });
    await api.answerCallbackQuery({ callback_query_id: query.id });
    return;
  }

  if (data === 'admin:toggle_fj') {
    if (!isAdm) return;
    const fj = await getForceJoinConfig();
    const newStatus = !fj.enabled;
    await setForceJoinConfig({ enabled: newStatus });
    await api.answerCallbackQuery({
      callback_query_id: query.id,
      text: newStatus ? 'قفل جوین اجباری روشن شد ✅' : 'قفل جوین اجباری خاموش شد ❌'
    });

    const updated = await getForceJoinConfig();
    const text = `📢 *مدیریت جوین اجباری کانال (Mandatory Join)*\n\n` +
      `⚡️ *وضعیت قفل:* ${updated.enabled ? 'روشن و فعال ✅' : 'خاموش و غیرفعال ❌'}\n` +
      `📌 *آیدی کانال:* \`${updated.channel || 'هنوز تنطیم نشده'}\`\n` +
      `🏷 *عنوان نمایشی:* ${updated.title}\n\n` +
      `💡 وقتی قفل فعال باشد، هیچ کاربری بدون عضویت در کانال نمی‌تواند از ربات استفاده کند.`;

    await api.editMessageText({
      chat_id: chat.id,
      message_id: message.message_id,
      text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: updated.enabled ? '🔴 خاموش کردن قفل اجباری' : '🟢 روشن کردن قفل اجباری', callback_data: 'admin:toggle_fj' }],
          [{ text: '✏️ تغییر آیدی کانال', callback_data: 'admin:set_channel' }, { text: '🏷 تغییر نام کانال', callback_data: 'admin:set_channel_title' }],
          [{ text: '🔍 تست دسترسی و ادمین بودن ربات', callback_data: 'admin:test_channel' }],
          [{ text: '🔙 بازگشت به پنل اصلی مدیریت', callback_data: 'admin:refresh' }]
        ]
      }
    });
    return;
  }

  if (data === 'admin:set_channel') {
    if (!isAdm) return;
    await db.update(users)
      .set({ stepState: { step: 'awaiting_channel_id' } })
      .where(eq(users.id, user.id))
      .run();

    await api.answerCallbackQuery({ callback_query_id: query.id });
    await api.sendMessage({
      chat_id: chat.id,
      text: `✏️ *تنظیم آیدی کانال جوین اجباری*\n\nلطفاً آیدی عمومی کانال را با علامت @ بفرستید (مثال: \`@VoidMarket\`) یا آیدی عددی کانال خصوصی:\n\nبرای لغو دستور /cancel را ارسال کنید.`,
      parse_mode: 'Markdown',
    });
    return;
  }

  if (data === 'admin:set_channel_title') {
    if (!isAdm) return;
    await db.update(users)
      .set({ stepState: { step: 'awaiting_channel_title' } })
      .where(eq(users.id, user.id))
      .run();

    await api.answerCallbackQuery({ callback_query_id: query.id });
    await api.sendMessage({
      chat_id: chat.id,
      text: `🏷 *تنظیم عنوان نمایشی کانال*\n\nلطفاً نامی که در پیام قفل به کاربران نمایش داده می‌شود را بفرستید:\n(مثال: کانال رسمی بازار Void)`,
      parse_mode: 'Markdown',
    });
    return;
  }

  if (data === 'admin:test_channel') {
    if (!isAdm) return;
    const fj = await getForceJoinConfig();
    if (!fj.channel) {
      await api.answerCallbackQuery({
        callback_query_id: query.id,
        text: '⚠️ ابتدا باید آیدی کانال را تنظیم کنید!',
        show_alert: true
      });
      return;
    }

    try {
      const botMe = await api.getMe();
      const member = await api.getChatMember({ chat_id: fj.channel, user_id: botMe.id });
      if (['administrator', 'creator'].includes(member.status)) {
        await api.answerCallbackQuery({
          callback_query_id: query.id,
          text: `✅ دسترسی تایید شد!\nربات در کانال ${fj.channel} مدیر است و قفل به صورت بی‌نقص کار می‌کند.`,
          show_alert: true,
        });
      } else {
        await api.answerCallbackQuery({
          callback_query_id: query.id,
          text: `⚠️ ربات در کانال عضو است ولی «ادمین» نیست! لطفاً در تنظیمات کانال به ربات دسترسی Admin بدهید.`,
          show_alert: true,
        });
      }
    } catch (err) {
      await api.answerCallbackQuery({
        callback_query_id: query.id,
        text: `❌ خطا در بررسی کانال: ${err.description || err.message}\nمطمئن شوید آیدی کانال صحیح است و ربات عضو کانال است.`,
        show_alert: true,
      });
    }
    return;
  }

  if (data === 'admin:broadcast_prompt') {
    if (!isAdm) return;
    await db.update(users)
      .set({ stepState: { step: 'awaiting_broadcast_message' } })
      .where(eq(users.id, user.id))
      .run();

    await api.answerCallbackQuery({ callback_query_id: query.id });
    await api.sendMessage({
      chat_id: chat.id,
      text: `📨 *ارسال پیام همگانی به همه کاربران*\n\nلطفاً متنی که قصد ارسال آن را دارید تایپ و ارسال فرمایید.\n(می‌توانید از شکلک‌ها، فونت بولد و لینک استفاده کنید).\n\nبرای انصراف /cancel را ارسال کنید.`,
      parse_mode: 'Markdown',
    });
    return;
  }

  if (data === 'admin:confirm_broadcast') {
    if (!isAdm) return;
    const stepState = user.stepState;
    if (!stepState || !stepState.broadcastText) {
      await api.answerCallbackQuery({ callback_query_id: query.id, text: 'متن پیام یافت نشد!' });
      return;
    }

    await api.answerCallbackQuery({ callback_query_id: query.id, text: '🚀 ارسال آغاز شد...' });
    await api.editMessageText({
      chat_id: chat.id,
      message_id: message.message_id,
      text: `⏳ *در حال ارسال پیام همگانی به تمام کاربران...*\nلطفاً چند لحظه شکیبا باشید.`,
      parse_mode: 'Markdown',
    });

    const report = await executeBroadcast(stepState.broadcastText);
    await db.update(users).set({ stepState: null }).where(eq(users.id, user.id)).run();

    let reportMsg = `🎉 *ارسال پیام همگانی به پایان رسید!*\n\n`;
    reportMsg += `📊 *گزارش تفصیلی:*\n`;
    reportMsg += `• کل کاربران در پایگاه داده: \`${report.total}\`\n`;
    reportMsg += `• با موفقیت تحویل داده شد: \`${report.sent}\` ✅\n`;
    reportMsg += `• ربات را بلاک کرده بودند: \`${report.blocked}\` 🚫\n`;
    reportMsg += `• ناموفق: \`${report.failed}\` ❌\n`;
    reportMsg += `⏱ زمان کل عملیات: \`${report.durationSeconds}\` ثانیه`;

    await api.sendMessage({
      chat_id: chat.id,
      text: reportMsg,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 پنل مدیریت', callback_data: 'admin:refresh' }]]
      }
    });
    return;
  }

  if (data === 'admin:cancel_broadcast') {
    if (!isAdm) return;
    await db.update(users).set({ stepState: null }).where(eq(users.id, user.id)).run();
    await api.answerCallbackQuery({ callback_query_id: query.id, text: 'ارسال همگانی لغو شد' });
    await api.editMessageText({
      chat_id: chat.id,
      message_id: message.message_id,
      text: `❌ ارسال پیام همگانی لغو شد.`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 بازگشت به پنل مدیریت', callback_data: 'admin:refresh' }]]
      }
    });
    return;
  }

  if (data === 'admin:tick') {
    if (!isAdm) return;
    const res = await processDueReminders(50);
    await api.answerCallbackQuery({
      callback_query_id: query.id,
      text: `اجرا شد: ${res.delivered} تحویل شد | ${res.skipped} معلق`,
      show_alert: true,
    });
    return;
  }

  if (data === 'admin:refresh') {
    if (!isAdm) return;
    const stats = await getSystemAnalytics();
    const fj = await getForceJoinConfig();

    let adminMsg = `👑 *The Void Markt — پنل مدیریت کل*\n`;
    adminMsg += `🆔 مدیر کل: \`${fromUser.id}\`\n\n`;
    adminMsg += `📊 *شاخص‌های عملکردی و وضعیت سرورلس*\n\n`;
    adminMsg += `👥 *کاربران:*\n`;
    adminMsg += `• کل کاربران: \`${stats.users.total}\` نفر\n`;
    adminMsg += `• فعال در ۲۴ ساعت گذشته: \`${stats.users.active24h}\` نفر\n`;
    adminMsg += `• فعال در ۷ روز اخیر: \`${stats.users.active7d}\` نفر\n\n`;
    adminMsg += `⏰ *یادآورها:*\n`;
    adminMsg += `• کل یادآورهای ثبت‌شده: \`${stats.reminders.total}\`\n`;
    adminMsg += `• فعال در صف: \`${stats.reminders.active}\` | تکمیل: \`${stats.reminders.completed}\`\n\n`;
    adminMsg += `⚡️ *تحویل اعلان‌ها:*\n`;
    adminMsg += `• تحویل موفق: \`${stats.delivery.successful}\` | ناموفق: \`${stats.delivery.failed}\` (${stats.delivery.successRate}%)\n\n`;
    adminMsg += `📢 *جوین اجباری کانال:* ${fj.enabled ? 'روشن ✅' : 'خاموش ❌'}\n`;
    adminMsg += `• کانال: \`${fj.channel || 'تنظیم نشده'}\``;

    await api.editMessageText({
      chat_id: chat.id,
      message_id: message.message_id,
      text: adminMsg,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📢 مدیریت جوین اجباری', callback_data: 'admin:force_join' },
            { text: '📨 ارسال پیام همگانی', callback_data: 'admin:broadcast_prompt' }
          ],
          [
            { text: '⚡️ ارسال فوری صف (Tick)', callback_data: 'admin:tick' },
            { text: '🔄 بروزرسانی مجدد', callback_data: 'admin:refresh' }
          ],
          [
            { text: '🔙 بازگشت به منوی کاربری', callback_data: 'menu:main' }
          ]
        ]
      }
    });
    await api.answerCallbackQuery({ callback_query_id: query.id, text: 'اطلاعات بروز شد' });
    return;
  }

  await api.answerCallbackQuery({ callback_query_id: query.id });
}
