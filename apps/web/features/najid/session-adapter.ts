import { apiRequest, ApiClientError } from '../../lib/api';
import type { SessionAdapter, SessionUser } from '../../lib/session';

type AuthMe = { userId: string; kind: 'STAFF' | 'CUSTOMER'; roles: string[]; customerId: string | null };
function readCsrf() {
  const token = document.cookie.split(';').map(part => part.trim()).find(part => part.startsWith('bl_csrf='))?.slice('bl_csrf='.length);
  if (!token) throw new Error('Your session security token is missing. Refresh and sign in again.');
  return { token: decodeURIComponent(token), headerName: 'x-csrf-token' };
}

export const najidSessionAdapter: SessionAdapter = {
  async getSession(): Promise<SessionUser | null> {
    try {
      const auth = await apiRequest<AuthMe>('/auth/me');
      // /auth/me currently omits email, although Basim's SessionUser requires it.
      // The feature shell does not display this field; access relies on server roles.
      return { id: auth.userId, email: '', roles: auth.roles };
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) return null;
      throw error;
    }
  },
  async logout() {
    await apiRequest('/auth/logout', { method: 'POST', csrf: readCsrf() });
  },
};
