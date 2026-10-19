import { EndpointError } from 'sdk';
import { processDueReminders } from '../lib/queue.js';
import { isUserAdmin } from '../lib/admin.js';

/**
 * Endpoint for scheduled execution or diagnostics.
 * Invoked by external cron, GitHub Actions, or local runner via `npx tgcloud run endpoints/tick`.
 * If invoked from a Mini App client, requires admin privileges.
 */
export default async function (input, ctx) {
  // If invoked with authenticated user credentials, verify admin rights
  if (ctx?.initData?.user) {
    const isAdmin = await isUserAdmin(ctx.initData.user.id);
    if (!isAdmin) {
      throw new EndpointError('Access denied: admin rights required', { code: 'FORBIDDEN' });
    }
  }

  const limit = input?.limit ? parseInt(input.limit, 10) : 50;
  const startedAt = Date.now();

  console.log(`[tick] Starting due reminder queue scan at ${new Date().toISOString()}...`);

  const result = await processDueReminders(limit);
  const durationMs = Date.now() - startedAt;

  console.log(`[tick] Completed in ${durationMs}ms:`, result);

  return {
    ok: true,
    timestamp: Math.floor(Date.now() / 1000),
    durationMs,
    ...result,
  };
}
