'use client';

import { useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import { AppShell, type AppNavigationItem } from '../../components/shared/app-shell';
import { ErrorState, LoadingState } from '../../components/shared/ui';
import { SessionProvider, useSession } from '../../lib/session';
import { najidSessionAdapter } from './session-adapter';

const financeNavigation: readonly AppNavigationItem[] = [
  { label: 'Finance dashboard', href: '/finance' },
  { label: 'Invoices', href: '/finance/invoices' },
  { label: 'Payments', href: '/finance/payments' },
  { label: 'Due-date board', href: '/finance/kanban' },
  { label: 'Quarterly reports', href: '/finance/reports' },
  { label: 'Offline drafts', href: '/offline-drafts' },
];
const customerNavigation: readonly AppNavigationItem[] = [
  { label: 'Your account', href: '/portal' },
  { label: 'Subscriptions', href: '/portal/subscriptions' },
  { label: 'Invoices and payments', href: '/portal/invoices' },
  { label: 'Offline drafts', href: '/offline-drafts' },
];

export function NajidSessionArea({ area, children }: { area: 'finance' | 'customer'; children: ReactNode }) {
  const adapter = useMemo(() => najidSessionAdapter, []);
  return <SessionProvider adapter={adapter}><SessionGate area={area}>{children}</SessionGate></SessionProvider>;
}

function SessionGate({ area, children }: { area: 'finance' | 'customer'; children: ReactNode }) {
  const session = useSession();
  const permitted = area === 'finance'
    ? session.user?.roles.some(role => ['ADMIN', 'FINANCE'].includes(role))
    : session.user?.roles.includes('CUSTOMER');
  const navigation = area === 'finance' ? financeNavigation : customerNavigation;
  if (session.status === 'loading') return <div className="min-h-screen p-6"><LoadingState label="Checking your Brightloop session…" /></div>;
  if (session.status === 'error') return <div className="min-h-screen p-6"><ErrorState message={session.error?.message ?? 'Your session could not be checked.'} retry={() => void session.refresh()} /></div>;
  if (session.status === 'unauthenticated') return <div className="min-h-screen p-6"><section className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-6"><h1 className="text-lg font-semibold">Sign in required</h1><p className="mt-2 text-sm text-slate-600">No active session was found. The shared sign-in screen is not available in this branch yet.</p><Link href="/" className="mt-4 inline-block font-medium text-indigo-800 underline">Back to Brightloop</Link></section></div>;
  if (!permitted) return <div className="min-h-screen p-6"><ErrorState message={`Your session does not have access to the ${area} workspace.`} /></div>;
  return <AppShell navigation={navigation} user={null} brand="Brightloop">{children}</AppShell>;
}
