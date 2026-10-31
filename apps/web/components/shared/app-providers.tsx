'use client';

import type { ReactNode } from 'react';
import { apiSessionAdapter, SessionProvider } from '../../lib/session';

export function AppProviders({ children }: { children: ReactNode }) {
  return <SessionProvider adapter={apiSessionAdapter}>{children}</SessionProvider>;
}