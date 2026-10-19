import { api, db } from 'sdk';
import { users } from '../schema.js';

/**
 * Broadcasts a text message to all registered users in the database.
 * Respects Telegram Bot API rate limits (maximum ~30 messages/sec).
 */
export async function executeBroadcast(text) {
  const startTime = Date.now();
  const allUsers = await db.select().from(users).all();

  let sent = 0;
  let blocked = 0;
  let failed = 0;

  for (const u of allUsers) {
    const targetChatId = u.chatId || u.tgId;
    if (!targetChatId) continue;

    try {
      await api.sendMessage({
        chat_id: targetChatId,
        text: text,
        parse_mode: 'Markdown',
      });
      sent++;
    } catch (err) {
      const errMsg = (err.description || err.message || '').toLowerCase();
      if (errMsg.includes('blocked') || errMsg.includes('forbidden') || errMsg.includes('user is deactivated')) {
        blocked++;
      } else {
        // Retry once without Markdown in case formatting was malformed
        try {
          await api.sendMessage({
            chat_id: targetChatId,
            text: text,
          });
          sent++;
        } catch (retryErr) {
          failed++;
        }
      }
    }

    // Rate limiting: sleep 35ms between messages (~28 msg/sec)
    await new Promise((resolve) => setTimeout(resolve, 35));
  }

  const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));

  return {
    total: allUsers.length,
    sent,
    blocked,
    failed,
    durationSeconds,
  };
}
