import { db, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { users } from '../schema.js';

export default async function (input, ctx) {
  const user = ctx?.initData?.user;
  if (!user || !user.id) {
    throw new EndpointError('Authentication required', { code: 'UNAUTHORIZED' });
  }

  let record = await db.select().from(users).where(eq(users.tgId, user.id)).get();

  if (!record) {
    const now = Math.floor(Date.now() / 1000);
    await db.insert(users).values({
      tgId: user.id,
      chatId: user.id,
      username: user.username || null,
      firstName: user.first_name || '',
      lastName: user.last_name || null,
      lang: 'fa',
      calendarType: 'jalali',
      timezone: 'Asia/Tehran',
      createdAt: now,
      updatedAt: now,
    }).run();

    record = await db.select().from(users).where(eq(users.tgId, user.id)).get();
  }

  return {
    lang: record.lang,
    calendarType: record.calendarType,
    timezone: record.timezone,
  };
}
