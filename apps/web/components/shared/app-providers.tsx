'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { apiSessionAdapter, SessionProvider } from '../../lib/session';

function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return offline ? <div role="status" aria-live="polite" className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-950">You’re offline. Some actions require a connection.</div> : null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return <SessionProvider adapter={apiSessionAdapter}><OfflineBanner />{children}</SessionProvider>;
}
