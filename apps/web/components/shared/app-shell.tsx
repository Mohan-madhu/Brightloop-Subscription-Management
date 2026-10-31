'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const roles = user?.roles ?? [];
  const visibleNavigation = navigation.filter((item) => !item.roles?.length || item.roles.some((role) => roles.includes(role)));
  const currentItem = [...visibleNavigation].sort((a, b) => b.href.length - a.href.length).find((item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`)));
  const initials = user?.email?.split('@')[0]?.slice(0, 2).toUpperCase() || roles[0]?.slice(0, 2) || 'BL';

  return <div className="min-h-screen bg-[#f7f7fc] text-slate-900 md:grid md:grid-cols-[16rem_minmax(0,1fr)]">
    <header className="flex min-h-16 items-center justify-between border-b border-slate-200/80 bg-white px-4 md:hidden">
      <Link href="/" className="flex items-center gap-2.5 font-extrabold tracking-tight text-slate-950"><span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-xl bg-violet-600 text-xl text-white">b</span>{brand}</Link>
      <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-violet-50" aria-expanded={mobileOpen} aria-controls="primary-navigation" onClick={() => setMobileOpen((value) => !value)}><span aria-hidden="true">☰</span> Menu</button>
    </header>
    <aside className={`${mobileOpen ? 'block' : 'hidden'} border-b border-slate-200/80 bg-white md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-b-0 md:border-r`}>
      <div className="hidden min-h-[84px] items-center border-b border-slate-100 px-6 md:flex"><Link href="/" className="flex items-center gap-3"><span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-600 text-2xl font-black text-white shadow-md shadow-violet-600/20">b</span><span><span className="block text-lg font-extrabold tracking-tight text-slate-950">{brand.toLowerCase()}</span><span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Subscriptions</span></span></Link></div>
      <div className="mx-4 mt-4 hidden items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 p-3 md:flex"><span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-sm font-bold text-violet-700">B</span><span className="min-w-0"><span className="block truncate text-xs font-bold text-slate-800">Brightloop workspace</span><span className="block text-[11px] text-slate-500">Subscription management</span></span></div>
      <nav id="primary-navigation" aria-label="Primary navigation" className="flex-1 space-y-1 px-3 py-5">
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
        {visibleNavigation.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
          return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} aria-current={active ? 'page' : undefined} className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${active ? 'bg-violet-50 text-violet-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}>
            <span aria-hidden="true" className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold ${active ? 'bg-white text-violet-700 shadow-sm' : 'bg-slate-100 text-slate-500 group-hover:bg-white'}`}>{item.label.slice(0, 1)}</span>{item.label}
          </Link>;
        })}
      </nav>
      {user && <div className="border-t border-slate-100 p-4"><div className="flex items-center gap-3"><span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{initials}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900">{user.email ?? 'Brightloop user'}</span><span className="block text-xs text-slate-500">{roles.map((role) => role.toLowerCase()).join(' · ')}</span></span></div>{onLogout && <button type="button" className="mt-3 min-h-10 rounded-lg px-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-violet-700" onClick={() => void onLogout()}>Sign out</button>}</div>}
    </aside>
    <div className="min-w-0">
      <header className="hidden min-h-[84px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-8 backdrop-blur md:flex lg:px-10">
        <div className="flex items-center gap-3 text-sm"><span className="text-slate-400">Workspace</span><span aria-hidden="true" className="text-slate-300">/</span><span className="font-semibold text-slate-700">{currentItem?.label ?? 'Overview'}</span></div>
        <div className="flex items-center gap-4">{user?.email && <span className="max-w-56 truncate text-xs font-medium text-slate-500">{user.email}</span>}<span role="img" aria-label={`Signed in ${roles.map((role) => role.toLowerCase()).join(', ') || 'workspace'}`} className="grid h-10 w-10 place-items-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{initials}</span></div>
      </header>
      <main className="min-w-0 p-4 sm:p-6 lg:p-8"><div className="mx-auto w-full max-w-7xl">{children}</div></main>
    </div>
  </div>;
}
