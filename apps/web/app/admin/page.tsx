import Link from 'next/link';
export default function AdminHome() {
  const sections = [
    { label: 'Staff access', detail: 'Manage workspace roles and staff accounts.', href: '/admin/staff', mark: 'S' },
    { label: 'Products and variants', detail: 'Maintain products, variants and catalog pricing.', href: '/admin/products', mark: 'P' },
    { label: 'Plans and add-ons', detail: 'Configure subscription plans and optional add-ons.', href: '/admin/plans', mark: '↻' },
    { label: 'Tax rules', detail: 'Set the tax rules used for billing.', href: '/admin/taxes', mark: '%' },
    { label: 'Discounts', detail: 'Create and manage discount codes.', href: '/admin/discounts', mark: 'D' },
  ];
  return <>
    <header className="mb-8"><p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-700">Brightloop workspace</p><h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Workspace setup</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Manage the settings that shape your subscription catalog and team access.</p></header>
    <nav aria-label="Admin sections" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{sections.map(({ label, detail, href, mark }) => <Link key={href} href={href} className="group flex min-h-36 items-start gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.03] transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
      <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-50 font-bold text-violet-700 transition group-hover:bg-violet-100">{mark}</span><span className="min-w-0"><span className="flex items-center justify-between gap-2 font-bold text-slate-900">{label}<span aria-hidden="true" className="text-violet-600 transition group-hover:translate-x-1">→</span></span><span className="mt-2 block text-sm leading-6 text-slate-500">{detail}</span></span>
    </Link>)}</nav>
  </>;
}
