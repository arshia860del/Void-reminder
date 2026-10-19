import { db, EndpointError } from 'sdk';
import { eq, and } from 'sdk/db';
import { reminders } from '../schema.js';

export default async function (input, ctx) {
  const user = ctx?.initData?.user;
  if (!user || !user.id) {
    throw new EndpointError('Authentication required', { code: 'UNAUTHORIZED' });
  }

  const { id } = input || {};
  const remId = parseInt(id, 10);
  if (!remId) {
    throw new EndpointError('Valid reminder id is required', { code: 'INVALID_ID' });
  }

  const now = Math.floor(Date.now() / 1000);
  const result = await db.update(reminders)
    .set({ isArchived: true, updatedAt: now })
    .where(and(eq(reminders.id, remId), eq(reminders.userId, user.id)))
    .run();

  if (result.rowsAffected === 0) {
    throw new EndpointError('Reminder not found or access denied', { code: 'NOT_FOUND' });
  }

  return { ok: true, id: remId };
}
