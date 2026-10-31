'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
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
  const pathname = usePathname();
  const roles = user?.roles ?? [];
  const visibleNavigation = navigation.filter((item) => !item.roles?.length || item.roles.some((role) => roles.includes(role)));
  const current = visibleNavigation.find((item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`)));
  const crumbs = pathname.split('/').filter(Boolean).map((part) => part.replace(/[-_]/g, ' '));

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [mobileOpen]);

  return <div className="min-h-screen bg-slate-50 text-slate-900 md:grid md:grid-cols-[15.5rem_minmax(0,1fr)]">
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:hidden">
      <Link href="/" className="flex items-center gap-2 font-bold text-indigo-800"><span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-sm text-white">B</span>{brand}</Link>
      <button type="button" className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold" aria-expanded={mobileOpen} aria-controls="primary-navigation" onClick={() => setMobileOpen((value) => !value)}>{mobileOpen ? 'Close' : 'Menu'}</button>
    </header>
    {mobileOpen && <button type="button" aria-label="Close navigation" className="fixed inset-0 z-20 bg-slate-950/40 md:hidden" onClick={() => setMobileOpen(false)} />}
    <aside className={`${mobileOpen ? 'fixed inset-y-0 left-0 z-30 block w-64 shadow-xl' : 'hidden'} border-b border-slate-200 bg-white md:sticky md:top-0 md:block md:min-h-screen md:border-b-0 md:border-r md:shadow-none`}>
      <div className="flex h-16 items-center border-b border-slate-200 px-5"><Link href="/" className="flex items-center gap-2 font-bold text-indigo-800"><span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-sm text-white">B</span>{brand}<span className="hidden text-xs font-medium text-slate-500 lg:inline">Subscription Management</span></Link></div>
      <nav id="primary-navigation" aria-label="Primary navigation" className="space-y-1 p-3">
        {visibleNavigation.map((item) => { const active = current?.href === item.href; return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} aria-current={active ? 'page' : undefined} className={`block min-h-10 rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'}`}>{item.label}</Link>; })}
      </nav>
      {user && <div className="border-t border-slate-200 p-4 md:absolute md:bottom-0 md:w-[15.5rem]">
        <p className="truncate text-sm font-semibold">{user.email ?? user.roles.join(', ')}</p><p className="mt-1 text-xs text-slate-500">{user.roles.join(' · ')}</p>
        {onLogout && <button type="button" className="mt-3 min-h-10 text-sm font-medium text-indigo-800 underline" onClick={() => void onLogout()}>Sign out</button>}
      </div>}
    </aside>
    <div className="min-w-0"><div className="hidden min-h-16 items-center justify-between border-b border-slate-200 bg-white px-8 md:flex"><nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500"><Link href="/" className="font-semibold text-indigo-700">{brand}</Link>{crumbs.map((crumb, index) => <span key={`${crumb}-${index}`} className="flex items-center gap-2"><span aria-hidden="true">/</span><span className={index === crumbs.length - 1 ? 'font-semibold capitalize text-slate-900' : 'capitalize'}>{crumb}</span></span>)}</nav><span className="text-xs font-medium text-emerald-700">Connected</span></div><main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main></div>
  </div>;
}
