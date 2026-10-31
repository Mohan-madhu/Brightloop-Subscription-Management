import Link from 'next/link';

const finance = [
  ['/finance', 'Dashboard'], ['/finance/invoices', 'Invoices'],
  ['/finance/kanban', 'Due-date board'], ['/finance/reports', 'Quarterly reports'],
];
const customer = [
  ['/portal', 'Account overview'], ['/portal/subscriptions', 'Subscriptions'],
  ['/portal/invoices', 'Invoices and payments'],
];

export function NajidFeaturePending({ area, page, dependencies }: { area: 'Finance' | 'Customer'; page: string; dependencies: string[] }) {
  const links = area === 'Finance' ? finance : customer;
  return <main className="mx-auto w-full max-w-6xl p-4 sm:p-8">
    <div className="mb-5"><p className="text-sm font-semibold text-indigo">{area} workspace</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">{page}</h1><p className="mt-1 text-sm text-slate-600">This feature is waiting on its documented API and shared session integration.</p></div>
    <nav aria-label={`${area} pages`} className="mb-5 flex flex-wrap gap-2">{links.map(([href, label]) => <Link key={href} href={href} className={`rounded-lg border px-3 py-2 text-sm font-medium ${href === `/${area === 'Customer' ? 'portal' : 'finance'}` && page !== 'Dashboard' && page !== 'Account overview' ? 'border-slate-200 bg-white text-slate-700' : 'border-indigo/20 bg-indigo/5 text-indigo'}`}>{label}</Link>)}</nav>
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950"><h2 className="font-semibold">Integration dependency</h2><p className="mt-1 text-sm">No feature data or actions are simulated here. The current API contract only defines health and public lookup routes.</p><ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{dependencies.map(item => <li key={item}>{item}</li>)}</ul></section>
    <p className="mt-4 text-xs text-slate-500">When the API and Basim’s shared client/session contract are committed, these routes can mount the corresponding data-driven screens.</p>
  </main>;
}
