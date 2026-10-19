import { api, db } from 'sdk';
import { eq } from 'sdk/db';
import { users, reminders } from '../schema.js';
import { getOrCreateUser, getUserReminders, getTodayReminders, formatReminderMessage } from '../lib/bot.js';
import {
  formatJalali,
  formatGregorian,
  parseJalaliToTimestamp,
  parseGregorianToTimestamp
} from '../lib/dates.js';
import {
  getMainMenuKeyboard,
  getDateQuickKeyboard,
  getRecurrenceKeyboard,
  getReminderActionKeyboard,
  getSettingsKeyboard
} from '../lib/keyboards.js';
import { processDueReminders, scheduleJobForReminder } from '../lib/queue.js';
import { isUserAdmin, getSystemAnalytics, claimAdminAccess } from '../lib/admin.js';
import { verifyUserMembership, getForceJoinKeyboard, getForceJoinMessage } from '../lib/forceJoin.js';
import { getForceJoinConfig, setForceJoinConfig } from '../lib/settings.js';
import { executeBroadcast } from '../lib/broadcast.js';
import { parseNaturalLanguageReminder } from '../lib/nlp.js';
import { t } from '../lib/i18n.js';

export default async function (message, ctx) {
  if (!message || !message.chat || !message.from) return;

  const chat = message.chat;
  const fromUser = message.from;
  const text = (message.text || '').trim();

  // 1. Opportunistic processing: check and deliver any due reminders
  try {
    await processDueReminders(15);
  } catch (err) {
    console.error('[message-handler] Opportunistic queue error:', err);
  }

  // 2. Fetch or initialize user in SQLite
  const user = await getOrCreateUser(fromUser, chat);
  const lang = user.lang || 'fa';
  const tz = user.timezone || 'Asia/Tehran';

  // Always allow /myid even if forced join or in step dialog
  if (text === '/myid') {
    await api.sendMessage({
      chat_id: chat.id,
      text: `🆔 *شناسه عددی تلگرام شما:*\n\`${fromUser.id}\`\n\nبرای اعطای دسترسی انحصاری مدیریت، این شناسه را در فایل \`tgcloud/lib/admin.js\` قرار دهید.`,
      parse_mode: 'Markdown',
    });
    return;
  }

  // 3. Forced Join Check for non-admins
  const membership = await verifyUserMembership(fromUser.id);
  if (!membership.isMember) {
    await api.sendMessage({
      chat_id: chat.id,
      text: getForceJoinMessage(membership.config.channel, membership.config.title),
      parse_mode: 'Markdown',
      reply_markup: getForceJoinKeyboard(membership.config.channel),
    });
    return;
  }

  // 4. Handle System / Slash Commands
  if (text.startsWith('/')) {
    const parts = text.split(/\s+/);
    const command = parts[0].toLowerCase().split('@')[0];

    if (command === '/cancel') {
      await db.update(users).set({ stepState: null }).where(eq(users.id, user.id)).run();
      await api.sendMessage({
        chat_id: chat.id,
        text: '❌ عملیات لغو شد و به منوی اصلی برگشتید.',
        reply_markup: getMainMenuKeyboard(lang),
      });
      return;
    }

    // Reset stepState when starting a new slash command
    if (user.stepState) {
      await db.update(users).set({ stepState: null }).where(eq(users.id, user.id)).run();
    }

    if (command === '/start') {
      const welcomeText = `${t('brand_title', lang)}\n\n${t('welcome', lang)}`;
      await api.sendMessage({
        chat_id: chat.id,
        text: welcomeText,
        parse_mode: 'Markdown',
        reply_markup: getMainMenuKeyboard(lang),
      });
      return;
    }

    if (command === '/new') {
      await db.update(users)
        .set({ stepState: { step: 'awaiting_title' } })
        .where(eq(users.id, user.id))
        .run();

      await api.sendMessage({
        chat_id: chat.id,
        text: `${t('brand_title', lang)}\n\n${t('prompt_enter_title', lang)}`,
        parse_mode: 'Markdown',
      });
      return;
    }

    if (command === '/list') {
      const items = await getUserReminders(user.id);
      if (items.length === 0) {
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
      return;
    }

    if (command === '/today') {
      const todayItems = await getTodayReminders(user.id, tz);
      if (todayItems.length === 0) {
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
      return;
    }

    if (command === '/settings') {
      const calName = user.calendarType === 'jalali' ? t('calendar_jalali_selected', lang) : t('calendar_greg_selected', lang);
      await api.sendMessage({
        chat_id: chat.id,
        text: `⚙️ *تنظیمات سیستم یادآور:*\n\n• تقویم فعال: *${calName}*\n• زبان ربات: *${lang === 'fa' ? 'فارسی' : 'English'}*\n• منطقه زمانی: \`${tz}\``,
        parse_mode: 'Markdown',
        reply_markup: getSettingsKeyboard(user.calendarType, lang),
      });
      return;
    }

    if (command === '/claimadmin') {
      const secret = parts[1] || '';
      const success = await claimAdminAccess(fromUser.id, secret);
      if (success) {
        await api.sendMessage({
          chat_id: chat.id,
          text: `👑 *دسترسی مدیر با موفقیت تایید و ثبت شد!*\nاکنون می‌توانید با دستور /admin وارد پنل مدیریت شوید.`,
          parse_mode: 'Markdown',
        });
      } else {
        await api.sendMessage({
          chat_id: chat.id,
          text: `❌ کلید مدیریت اشتباه است یا مدیریت قبلاً ادعا شده است.`,
        });
      }
      return;
    }

    if (command === '/admin') {
      const isAdmin = await isUserAdmin(fromUser.id);
      if (!isAdmin) {
        await api.sendMessage({
          chat_id: chat.id,
          text: t('admin_access_denied', lang),
        });
        return;
      }

      const stats = await getSystemAnalytics();
      const fj = await getForceJoinConfig();

      let adminMsg = `👑 *پنل مدیریت اختصاصی The Void Market*\n`;
      adminMsg += `🆔 مدیر کل: \`${fromUser.id}\`\n\n`;
      adminMsg += `📊 *شاخص‌های عملکردی و وضعیت سرورلس*\n\n`;
      adminMsg += `👥 *کاربران:*\n`;
      adminMsg += `• کل کاربران: \`${stats.users.total}\` نفر\n`;
      adminMsg += `• فعال در ۲۴ ساعت گذشته: \`${stats.users.active24h}\` نفر\n\n`;
      adminMsg += `⏰ *یادآورها:*\n`;
      adminMsg += `• کل یادآورها: \`${stats.reminders.total}\` | فعال: \`${stats.reminders.active}\` | تکمیل: \`${stats.reminders.completed}\`\n\n`;
      adminMsg += `⚡️ *تحویل اعلان‌ها:*\n`;
      adminMsg += `• تحویل موفق: \`${stats.delivery.successful}\` | ناموفق: \`${stats.delivery.failed}\` (${stats.delivery.successRate}%)\n\n`;
      adminMsg += `📢 *جوین اجباری کانال:* ${fj.enabled ? 'فعال ✅' : 'غیرفعال ❌'}\n`;
      adminMsg += `• کانال: \`${fj.channel || 'تنظیم نشده'}\`\n`;

      await api.sendMessage({
        chat_id: chat.id,
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
              { text: '🔄 بروزرسانی آمار', callback_data: 'admin:refresh' }
            ],
            [
              { text: '🔙 بازگشت به منوی کاربری', callback_data: 'menu:main' }
            ]
          ]
        }
      });
      return;
    }

    if (command === '/broadcast') {
      const isAdmin = await isUserAdmin(fromUser.id);
      if (!isAdmin) return;

      await db.update(users)
        .set({ stepState: { step: 'awaiting_broadcast_message' } })
        .where(eq(users.id, user.id))
        .run();

      await api.sendMessage({
        chat_id: chat.id,
        text: `📨 *ارسال پیام همگانی (Broadcast)*\n\nلطفاً متنی که می‌خواهید برای همه کاربران ربات ارسال شود را تایپ کرده و بفرستید.\n\nبرای انصراف دستور /cancel را بفرستید.`,
        parse_mode: 'Markdown',
      });
      return;
    }

    if (command === '/forcejoin') {
      const isAdmin = await isUserAdmin(fromUser.id);
      if (!isAdmin) return;

      const fj = await getForceJoinConfig();
      await api.sendMessage({
        chat_id: chat.id,
        text: `📢 *تنظیمات قفل عضویت اجباری*\n\n• وضعیت: ${fj.enabled ? 'روشن ✅' : 'خاموش ❌'}\n• کانال: \`${fj.channel || 'تنظیم نشده'}\`\n• عنوان: ${fj.title}`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: fj.enabled ? '🔴 خاموش کردن قفل' : '🟢 روشن کردن قفل', callback_data: 'admin:toggle_fj' }],
            [{ text: '✏️ تغییر آیدی کانال', callback_data: 'admin:set_channel' }],
            [{ text: '🔙 بازگشت به پنل مدیریت', callback_data: 'admin:refresh' }]
          ]
        }
      });
      return;
    }

    if (command.startsWith('/view_')) {
      const remId = parseInt(command.replace('/view_', ''), 10);
      if (remId) {
        const reminder = await db.select().from(reminders).where(eq(reminders.id, remId)).get();
        if (reminder && reminder.userId === user.id) {
          const detailMsg = formatReminderMessage(reminder, lang);
          await api.sendMessage({
            chat_id: chat.id,
            text: detailMsg,
            parse_mode: 'Markdown',
            reply_markup: getReminderActionKeyboard(reminder.id, lang),
          });
          return;
        }
      }
    }
  }

  // 5. Handle Multi-Step Conversational State
  const stepState = user.stepState;
  if (stepState && stepState.step) {
    // Admin: Awaiting Broadcast Message
    if (stepState.step === 'awaiting_broadcast_message') {
      const isAdmin = await isUserAdmin(fromUser.id);
      if (!isAdmin) return;

      const broadcastText = text;
      const count = await db.$count(users);

      await db.update(users)
        .set({
          stepState: {
            step: 'confirm_broadcast',
            broadcastText,
          }
        })
        .where(eq(users.id, user.id))
        .run();

      await api.sendMessage({
        chat_id: chat.id,
        text: `📋 *پیش‌نمایش پیام همگانی:*\n\n${broadcastText}\n\n──────────────────\n👥 *تعداد دریافت‌کنندگان:* \`${count}\` کاربر\n\nآیا از ارسال سراسری این پیام اطمینان دارید؟`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🚀 بله، هم‌اکنون ارسال کن', callback_data: 'admin:confirm_broadcast' },
              { text: '❌ انصراف', callback_data: 'admin:cancel_broadcast' }
            ]
          ]
        }
      });
      return;
    }

    // Admin: Awaiting Channel ID for Force Join
    if (stepState.step === 'awaiting_channel_id') {
      const isAdmin = await isUserAdmin(fromUser.id);
      if (!isAdmin) return;

      const channelHandle = text.trim();
      await setForceJoinConfig({ channel: channelHandle, enabled: true });
      await db.update(users).set({ stepState: null }).where(eq(users.id, user.id)).run();

      await api.sendMessage({
        chat_id: chat.id,
        text: `✅ *کانال جوین اجباری با موفقیت ذخیره و قفل فعال شد:*\n\n📢 آیدی کانال: \`${channelHandle}\`\n\n⚠️ حتماً مطمئن شوید ربات در این کانال «ادمین» است تا بتواند اعضا را بررسی کند.`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔍 بررسی اتصال ربات به کانال', callback_data: 'admin:test_channel' }],
            [{ text: '⚙️ مدیریت جوین اجباری', callback_data: 'admin:force_join' }],
            [{ text: '🔙 پنل مدیریت', callback_data: 'admin:refresh' }]
          ]
        }
      });
      return;
    }

    // Admin: Awaiting Channel Title for Force Join
    if (stepState.step === 'awaiting_channel_title') {
      const isAdmin = await isUserAdmin(fromUser.id);
      if (!isAdmin) return;

      const newTitle = text.trim();
      await setForceJoinConfig({ title: newTitle });
      await db.update(users).set({ stepState: null }).where(eq(users.id, user.id)).run();

      await api.sendMessage({
        chat_id: chat.id,
        text: `✅ نام کانال به *«${newTitle}»* به‌روزرسانی شد.`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '⚙️ بازگشت به تنظیمات جوین اجباری', callback_data: 'admin:force_join' }]
          ]
        }
      });
      return;
    }

    // User: Creating Reminder Dialog
    if (stepState.step === 'awaiting_title') {
      if (!text) {
        await api.sendMessage({
          chat_id: chat.id,
          text: t('prompt_enter_title', lang),
        });
        return;
      }

      await db.update(users)
        .set({
          stepState: {
            step: 'awaiting_date',
            title: text,
          }
        })
        .where(eq(users.id, user.id))
        .run();

      await api.sendMessage({
        chat_id: chat.id,
        text: `📌 موضوع: *${text}*\n\n${t('prompt_enter_date', lang)}`,
        parse_mode: 'Markdown',
        reply_markup: getDateQuickKeyboard(lang),
      });
      return;
    }

    if (stepState.step === 'awaiting_date') {
      const dateText = text.replace(/[-.]/g, '/');
      await db.update(users)
        .set({
          stepState: {
            ...stepState,
            step: 'awaiting_time',
            dateText,
          }
        })
        .where(eq(users.id, user.id))
        .run();

      await api.sendMessage({
        chat_id: chat.id,
        text: `🗓 تاریخ انتخاب شده: \`${dateText}\`\n\n${t('prompt_enter_time', lang)}`,
        parse_mode: 'Markdown',
      });
      return;
    }

    if (stepState.step === 'awaiting_time') {
      const timeMatch = text.match(/^(\d{1,2}):(\d{2})$/);
      if (!timeMatch) {
        await api.sendMessage({
          chat_id: chat.id,
          text: `⚠️ فرمت ساعت صحیح نیست.\n${t('prompt_enter_time', lang)}`,
        });
        return;
      }

      const timeText = text;
      const dateText = stepState.dateText;

      let targetTimestamp = null;
      if (dateText.startsWith('14') || user.calendarType === 'jalali') {
        targetTimestamp = parseJalaliToTimestamp(dateText, timeText, tz);
      } else {
        targetTimestamp = parseGregorianToTimestamp(dateText, timeText, tz);
      }

      if (!targetTimestamp) {
        targetTimestamp = Math.floor(Date.now() / 1000) + 3600;
      }

      const jalaliStr = formatJalali(targetTimestamp, true, tz);
      const gregStr = formatGregorian(targetTimestamp, true, tz);

      await db.update(users)
        .set({
          stepState: {
            ...stepState,
            step: 'awaiting_recurrence',
            targetTimestamp,
            targetJalali: jalaliStr,
            targetGregorian: gregStr,
          }
        })
        .where(eq(users.id, user.id))
        .run();

      await api.sendMessage({
        chat_id: chat.id,
        text: `🗓 زمان دقیق ثبت شده (به وقت شما):\n• شمسی: \`${jalaliStr}\`\n• میلادی: \`${gregStr}\`\n\n${t('prompt_select_recurrence', lang)}`,
        parse_mode: 'Markdown',
        reply_markup: getRecurrenceKeyboard(lang),
      });
      return;
    }
  }

  // 6. Intelligent Natural Language Processing (NLP) for quick reminder creation
  // e.g. "فردا ساعت ۱۸ جلسه کاری", "۱۰ دقیقه دیگه تماس با پشتیبانی فوری"
  const nlpParsed = parseNaturalLanguageReminder(text, tz);
  if (nlpParsed) {
    const nowTs = Math.floor(Date.now() / 1000);
    const jalaliStr = formatJalali(nlpParsed.targetTimestamp, true, tz);
    const gregStr = formatGregorian(nlpParsed.targetTimestamp, true, tz);

    const newRem = await db.insert(reminders)
      .values({
        userId: user.id,
        chatId: chat.id,
        title: nlpParsed.title,
        description: null,
        category: 'general',
        priority: nlpParsed.priority,
        targetTimestamp: nlpParsed.targetTimestamp,
        targetJalali: jalaliStr,
        targetGregorian: gregStr,
        recurrence: 'once',
        isCompleted: false,
        createdAt: nowTs,
        updatedAt: nowTs,
      })
      .returning()
      .get();

    await scheduleJobForReminder(newRem);

    const priorityBadge = nlpParsed.priority === 'urgent'
      ? '🔴 فوری (تکرار هر ۵ دقیقه تا انجام)'
      : nlpParsed.priority === 'high'
      ? '🟡 مهم'
      : '🟢 عادی';

    let nlpSuccessMsg = `⚡️ *یادآور هوشمند شما فوراً ثبت شد!*\n\n`;
    nlpSuccessMsg += `📌 *موضوع:* *${newRem.title}*\n`;
    nlpSuccessMsg += `🗓 *تاریخ و زمان:* \`${jalaliStr}\`\n`;
    nlpSuccessMsg += `🚨 *اولویت:* ${priorityBadge}\n\n`;
    nlpSuccessMsg += `در زمان تعیین شده ربات پیام یادآوری را برای شما ارسال خواهد کرد.`;

    await api.sendMessage({
      chat_id: chat.id,
      text: nlpSuccessMsg,
      parse_mode: 'Markdown',
      reply_markup: getReminderActionKeyboard(newRem.id, lang),
    });
    return;
  }

  // 7. Default fallback response
  await api.sendMessage({
    chat_id: chat.id,
    text: `${t('brand_title', lang)}\n\n${t('welcome', lang)}`,
    parse_mode: 'Markdown',
    reply_markup: getMainMenuKeyboard(lang),
  });
}
