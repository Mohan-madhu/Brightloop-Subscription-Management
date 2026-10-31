'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type SessionUser = { id: string; email: string; roles: readonly string[] };
export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';
export type SessionAdapter = {
  getSession: () => Promise<SessionUser | null>;
  logout: () => Promise<void>;
};
export type SessionContextValue = {
  status: SessionStatus;
  user: SessionUser | null;
  error: Error | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function asError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error('The session request failed.');
}

export function SessionProvider({ adapter, children }: { adapter: SessionAdapter; children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const currentUser = await adapter.getSession();
      setUser(currentUser);
      setStatus(currentUser ? 'authenticated' : 'unauthenticated');
    } catch (cause) {
      setUser(null);
      setError(asError(cause));
      setStatus('error');
    }
  }, [adapter]);

  const logout = useCallback(async () => {
    await adapter.logout();
    setUser(null);
    setError(null);
    setStatus('unauthenticated');
  }, [adapter]);

  useEffect(() => { void refresh(); }, [refresh]);

  return <SessionContext.Provider value={{ status, user, error, refresh, logout }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used within SessionProvider.');
  return value;
}