'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getCompany, getIntervals, type BillingInterval, type Company } from '../lib/api';

function State({ children, retry }: { children: React.ReactNode; retry?: () => void }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm" role={retry ? 'alert' : 'status'}>
    {children}{retry && <button onClick={retry} className="ml-3 rounded-xl bg-emerald-600 px-3 py-2 font-semibold text-white transition hover:bg-emerald-700">Retry</button>}
  </div>;
}

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M4.25 10h11.5M10 4.25 15.75 10 10 15.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function Home() {
  const [company, setCompany] = useState<Company | null>(null);
  const [intervals, setIntervals] = useState<BillingInterval[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [companyData, intervalData] = await Promise.all([getCompany(), getIntervals()]);
      setCompany(companyData);
      setIntervals(intervalData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load company details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return <main className="relative isolate min-h-screen overflow-hidden bg-slate-50 text-slate-950">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute -right-36 -top-44 h-[34rem] w-[34rem] rounded-full bg-emerald-100/60 blur-3xl" />
      <div className="absolute -left-48 top-[34rem] h-[28rem] w-[28rem] rounded-full bg-slate-200/70 blur-3xl" />
    </div>
    <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8">
      <header className="flex min-h-[84px] items-center justify-between border-b border-slate-200/80">
        <Link href="/" className="group flex items-center gap-3 rounded-xl" aria-label="Brightloop home">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-600 text-2xl font-black text-white shadow-lg shadow-emerald-600/20 transition group-hover:-rotate-3">B</span>
          <span><span className="block text-lg font-extrabold tracking-tight">brightloop</span><span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Subscriptions</span></span>
        </Link>
        <nav aria-label="Account navigation" className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white hover:text-emerald-700 sm:px-4">Sign in</Link>
          <Link href="/signup" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:px-5">Create account <ArrowIcon /></Link>
        </nav>
      </header>

      <section className="relative grid min-h-[420px] items-center gap-10 py-16 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Subscription management, made simple
          </div>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">A clearer way to manage <span className="text-emerald-600">every subscription.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">Keep plans, billing schedules and account details together in one place. Sign in to manage your workspace or create an account to get started.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700">Get started <ArrowIcon /></Link>
            <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50">Sign in to your account</Link>
          </div>
          <p className="mt-4 text-xs text-slate-500">Your company and billing information is kept up to date from Brightloop.</p>
        </div>

        <div className="relative mx-auto w-full max-w-lg lg:justify-self-end">
          <div aria-hidden="true" className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-emerald-200/70 via-slate-100/70 to-sky-100/60 blur-2xl" />
          <article className="relative overflow-hidden rounded-[1.75rem] border border-white bg-white/90 p-5 shadow-2xl shadow-slate-950/10 backdrop-blur sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">Your workspace</p><h2 className="mt-2 text-xl font-bold tracking-tight">Billing at a glance</h2><p className="mt-1 text-sm text-slate-500">Company details and available intervals</p></div>
              <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M4 7.5h16M6.5 4v3.5M17.5 4v3.5M6 11h4m-4 4h7m-7 4h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><rect x="3.5" y="5.5" width="17" height="15" rx="3" stroke="currentColor" strokeWidth="1.7" /></svg></span>
            </div>
            <div className="mt-6 space-y-3">
              {loading && <><div className="h-24 animate-pulse rounded-2xl bg-slate-100" /><div className="h-28 animate-pulse rounded-2xl bg-slate-100" /></>}
              {error && <State retry={() => void load()}>Could not load company details: {error}</State>}
              {company && !loading && <>
                <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
                  <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 font-bold text-emerald-700">{company.publicName.trim().charAt(0).toUpperCase()}</span><div className="min-w-0"><p className="text-xs font-medium text-slate-500">Workspace</p><h3 className="truncate font-bold">{company.publicName}</h3></div></div>
                  <p className="mt-4 text-sm text-slate-600">{company.legalName}</p>
                  <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{company.currency} currency</span><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{company.timezone}</span></div>
                </section>
                <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3"><h3 className="font-bold">Billing intervals</h3><span className="text-xs font-medium text-slate-500">{intervals.length} available</span></div>
                  {intervals.length ? <ul className="mt-4 grid grid-cols-2 gap-2">{intervals.map((interval) => <li key={interval.code} className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 text-sm font-medium text-slate-700"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{interval.name}</li>)}</ul> : <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">No active billing intervals are configured.</p>}
                </section>
              </>}
            </div>
            <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500" />Workspace information loads live from Brightloop</div>
          </article>
          <div aria-hidden="true" className="absolute -bottom-5 -left-5 hidden rounded-2xl border border-white bg-white px-4 py-3 shadow-lg sm:block"><span className="text-xs font-semibold text-slate-600">Built for simple billing</span><span className="ml-2 text-emerald-600">✦</span></div>
        </div>
      </section>

      <footer className="flex flex-col gap-2 border-t border-slate-200/80 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} Brightloop</span><span>Subscription management for your workspace</span></footer>
    </div>
  </main>;
}
