'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import type { SessionUser } from '../../lib/session';

export type AppNavigationItem = { label: string; href: string; roles?: readonly string[] };

export function AppShell({ children, navigation, user, brand = 'Brightloop', onLogout }: {
  children: ReactNode;
  navigation: readonly AppNavigationItem[];
  user?: SessionUser | null;
  brand?: string;
  onLogout?: () => void | Promise<void>;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const roles = user?.roles ?? [];
  const visibleNavigation = navigation.filter((item) => !item.roles?.length || item.roles.some((role) => roles.includes(role)));

  return <div className="min-h-screen bg-slate-50 text-slate-900 md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
    <header className="flex min-h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
      <Link href="/" className="font-semibold text-indigo-800">{brand}</Link>
      <button type="button" className="min-h-10 rounded-md border border-slate-300 px-3 text-sm font-medium" aria-expanded={mobileOpen} aria-controls="primary-navigation" onClick={() => setMobileOpen((value) => !value)}>Menu</button>
    </header>
    <aside className={`${mobileOpen ? 'block' : 'hidden'} border-b border-slate-200 bg-white md:block md:min-h-screen md:border-b-0 md:border-r`}>
      <div className="hidden h-14 items-center border-b border-slate-200 px-5 md:flex"><Link href="/" className="font-semibold text-indigo-800">{brand}</Link></div>
      <nav id="primary-navigation" aria-label="Primary navigation" className="space-y-1 p-3">
        {visibleNavigation.map((item) => <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="block min-h-10 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">{item.label}</Link>)}
      </nav>
      {user && <div className="border-t border-slate-200 p-4">
        <p className="truncate text-sm font-medium">{user.email ?? user.roles.join(', ')}</p>
        {onLogout && <button type="button" className="mt-3 min-h-10 text-sm text-indigo-800 underline" onClick={() => void onLogout()}>Sign out</button>}
      </div>}
    </aside>
    <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
  </div>;
}