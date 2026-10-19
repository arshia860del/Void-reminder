import { db, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { users } from '../schema.js';

export default async function (input, ctx) {
  const user = ctx?.initData?.user;
  if (!user || !user.id) {
    throw new EndpointError('Authentication required', { code: 'UNAUTHORIZED' });
  }

  const { lang, calendarType, timezone } = input || {};
  const updates = { updatedAt: Math.floor(Date.now() / 1000) };

  if (lang === 'fa' || lang === 'en') {
    updates.lang = lang;
  }

  if (calendarType === 'jalali' || calendarType === 'gregorian') {
    updates.calendarType = calendarType;
  }

  if (timezone && typeof timezone === 'string') {
    updates.timezone = timezone.trim();
  }

  await db.update(users)
    .set(updates)
    .where(eq(users.tgId, user.id))
    .run();

  return { ok: true, updates };
}
