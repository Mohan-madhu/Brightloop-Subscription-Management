'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import type { SessionUser } from '../../lib/session';

export type AppNavigationItem = { label: string; href: string; roles?: readonly string[] };

export function NavigationIcon({ href }: { href: string }) {
  const section = href.split('/').filter(Boolean).at(-1) ?? 'overview';
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" {...common}>
    {section === 'admin' || section === 'finance' || section === 'overview' ? <><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></>
      : section === 'staff' || section === 'customers' || section === 'portal' ? <><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.5-3 2.3-4.5 5.5-4.5s5 1.5 5.5 4.5M16 5.5a3 3 0 0 1 0 5.8M17 14.8c2.1.4 3.3 1.8 3.7 4.2" /></>
      : section === 'products' ? <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4.5 7.8 7.5 4.3 7.5-4.3M12 12v8.5" /></>
      : section === 'plans' || section === 'subscriptions' ? <><path d="M7 7h11l-2.5-2.5M17 17H6l2.5 2.5" /><path d="M18 7a7 7 0 0 1 1 8M6 17a7 7 0 0 1-1-8" /></>
      : section === 'taxes' ? <><circle cx="7.5" cy="7.5" r="2.5" /><circle cx="16.5" cy="16.5" r="2.5" /><path d="m18 5-12 14" /></>
      : section === 'discounts' ? <><path d="M20 13 13 20 4 11V4h7l9 9Z" /><circle cx="8" cy="8" r="1" /></>
      : section === 'payments' ? <><rect x="3.5" y="5" width="17" height="14" rx="2.5" /><path d="M4 9h16M7 14h4" /></>
      : section === 'kanban' ? <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3.5v3M16 3.5v3M4 9h16M8 13h2m4 0h2m-8 3h2" /></>
      : section === 'reports' ? <><path d="M4 20V5M4 20h16" /><path d="m7 15 4-4 3 2 5-6" /><circle cx="19" cy="7" r="1" /></>
      : <><path d="M6 4h9l4 4v12H6z" /><path d="M14 4v5h5M9 13h7M9 17h7" /></>}
  </svg>;
}

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
          const active = currentItem?.href === item.href;
          return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} aria-current={active ? 'page' : undefined} className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${active ? 'bg-violet-50 text-violet-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}>
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition ${active ? 'bg-white text-violet-700 shadow-sm' : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-violet-700'}`}><NavigationIcon href={item.href} /></span>{item.label}
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
