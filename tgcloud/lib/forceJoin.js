import { api } from 'sdk';
import { getForceJoinConfig } from './settings.js';
import { isUserAdmin } from './admin.js';

/**
 * Checks if a user is a member of the required channel.
 * Returns { isMember: true } if:
 * 1. Forced join is disabled
 * 2. Channel is not configured
 * 3. The user is an administrator
 * 4. The user has status 'creator', 'administrator', 'member', or 'restricted' (with is_member)
 */
export async function verifyUserMembership(tgUserId) {
  if (!tgUserId) return { isMember: true };

  // Admins bypass force join check
  const isAdmin = await isUserAdmin(tgUserId);
  if (isAdmin) {
    return { isMember: true, isAdmin: true };
  }

  const config = await getForceJoinConfig();
  if (!config.enabled || !config.channel) {
    return { isMember: true };
  }

  try {
    const member = await api.getChatMember({
      chat_id: config.channel,
      user_id: tgUserId,
    });

    const allowedStatuses = ['creator', 'administrator', 'member'];
    if (allowedStatuses.includes(member.status)) {
      return { isMember: true, status: member.status, config };
    }

    if (member.status === 'restricted' && member.is_member) {
      return { isMember: true, status: member.status, config };
    }

    return {
      isMember: false,
      status: member.status,
      config,
    };
  } catch (err) {
    console.warn(`[forceJoin] Error checking membership for user ${tgUserId} in ${config.channel}:`, err.message);
    // If the bot itself is not admin or channel is private/invalid,
    // we return false but with an error flag so admin can diagnose
    return {
      isMember: false,
      error: err.message,
      config,
    };
  }
}

/**
 * Generates the inline keyboard for forced channel join.
 */
export function getForceJoinKeyboard(channelHandle) {
  let cleanHandle = channelHandle.trim();
  let joinUrl = '';

  if (cleanHandle.startsWith('@')) {
    joinUrl = `https://t.me/${cleanHandle.replace('@', '')}`;
  } else if (cleanHandle.startsWith('https://t.me/')) {
    joinUrl = cleanHandle;
  } else {
    joinUrl = `https://t.me/${cleanHandle}`;
  }

  return {
    inline_keyboard: [
      [
        {
          text: '📢 عضویت در کانال رسمی',
          url: joinUrl,
        },
      ],
      [
        {
          text: '✅ عضو شدم (بررسی و ورود به ربات)',
          callback_data: 'check_force_join',
        },
      ],
    ],
  };
}

/**
 * Returns the Persian forced join prompt text.
 */
export function getForceJoinMessage(channelHandle, channelTitle = 'کانال رسمی') {
  return (
    `🔒 *دسترسی به ربات قفل است*\n\n` +
    `کاربر گرامی، برای استفاده از امکانات ربات یادآور The Void و باز کردن برنامه، لطفاً ابتدا در کانال رسمی ما عضو شوید:\n\n` +
    `📢 *${channelTitle}* (${channelHandle})\n\n` +
    `👇 پس از عضویت در کانال، دکمه‌ی *«عضو شدم»* را لمس کنید تا قفل ربات بلافاصله باز شود.`
  );
}
