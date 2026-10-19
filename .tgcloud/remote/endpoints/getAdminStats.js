import { EndpointError } from 'sdk';
import { isUserAdmin, getSystemAnalytics } from '../lib/admin.js';

export default async function (input, ctx) {
  const user = ctx?.initData?.user;
  if (!user || !user.id) {
    throw new EndpointError('Authentication required', { code: 'UNAUTHORIZED' });
  }

  const isAdmin = await isUserAdmin(user.id);
  if (!isAdmin) {
    throw new EndpointError('Access denied: admin rights required', { code: 'FORBIDDEN' });
  }

  const analytics = await getSystemAnalytics();
  return {
    ok: true,
    adminUser: {
      id: user.id,
      firstName: user.first_name,
      username: user.username,
    },
    analytics,
  };
}
