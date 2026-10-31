'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiListRequest, apiRequest, ApiClientError, type ApiPagination } from '../../lib/api';
import { Badge, Button, EmptyState, ErrorState, FormField, Input, LoadingState, Pagination, Select, Table, type TableColumn } from '../shared/ui';

type Customer = { id: string; legalName: string; billingEmail: string; user?: { email: string; firstName: string; lastName: string | null }; version?: number };
type Product = { id: string; name: string; type: string; salesPrice: string; active: boolean; variants?: { id: string; sku: string | null }[] };
type Plan = { id: string; name: string; price: string; active: boolean; allowPause: boolean; allowRenewal: boolean; allowEarlyClosure: boolean };
type QuotationLine = { id?: string; productId: string; variantId?: string | null; description: string; quantity: number; unitPrice: string };
type Quotation = { id: string; number: string; customerId: string; status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'; validUntil: string | null; terms: string | null; lines: QuotationLine[]; subscription?: Subscription | null };
type Subscription = { id: string; number: string; customerId: string; planId: string; status: 'DRAFT' | 'QUOTATION' | 'CONFIRMED' | 'ACTIVE' | 'PAUSED' | 'CLOSED'; startDate: string; expiryDate: string | null; paymentTerms: string | null; version: number; lines: { id: string; description: string; quantity: number; agreedPrice: string; isAddon: boolean }[]; logs: { status: string; note: string | null; effectiveAt: string | null; createdAt: string }[]; plan: Plan };

function displayError(cause: unknown): string {
  if (cause instanceof ApiClientError && cause.status === 403) return 'You do not have access to this customer or action.';
  return cause instanceof Error ? cause.message : 'The request could not be completed.';
}

function fieldErrors(cause: unknown): Record<string, string> {
  if (!(cause instanceof ApiClientError) || !Array.isArray(cause.details)) return {};
  return Object.fromEntries(cause.details.flatMap((item) => {
    if (typeof item !== 'object' || item === null || !('path' in item) || !('message' in item)) return [];
    const path = String(item.path);
    const linePath = path.match(/^lines\.(\d+)\.(productId|variantId|description|quantity|unitPrice)$/);
    return [[linePath ? `line-${linePath[1]}-${linePath[2]}` : path.split('.')[0], String(item.message)]];
  }));
}

function Title({ title, description }: { title: string; description: string }) {
  return <header className="mb-6"><p className="text-sm font-medium text-indigo-800">Marketing</p><h1 className="mt-1 text-2xl font-semibold">{title}</h1><p className="mt-2 text-sm text-slate-600">{description}</p></header>;
}

export function MarketingCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]); const [pagination, setPagination] = useState<ApiPagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0 }); const [page, setPage] = useState(1); const [search, setSearch] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { const params = new URLSearchParams({ page: String(page), pageSize: '20', sortBy: 'legalName', sortOrder: 'asc' }); if (search.trim()) params.set('search', search.trim()); const result = await apiListRequest<Customer>(`/customers?${params}`); setCustomers(result.data); setPagination(result.pagination); } catch (cause) { setError(displayError(cause)); } finally { setLoading(false); } }, [page, search]);
  useEffect(() => { void load(); }, [load]);
  const columns: TableColumn<Customer>[] = [
    { key: 'name', header: 'Customer', render: (customer) => <Link className="font-medium text-indigo-800 underline" href={`/marketing/customers/${customer.id}`}>{customer.legalName}</Link> },
    { key: 'email', header: 'Email', render: (customer) => customer.billingEmail },
    { key: 'contact', header: 'Account contact', render: (customer) => customer.user ? `${customer.user.firstName} ${customer.user.lastName ?? ''} · ${customer.user.email}` : '—' },
  ];
  return <><Title title="Assigned customers" description="The API scopes Marketing results to customers assigned to your staff account." />
    <div className="mb-4 max-w-md"><FormField id="customerSearch" label="Search customers"><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search legal name" /></FormField></div>
    {error && <div className="mb-4"><ErrorState message={error} retry={() => void load()} /></div>}{loading ? <LoadingState /> : <><Table caption="Assigned customers" columns={columns} rows={customers} getRowKey={(customer) => customer.id} emptyMessage="No assigned customers found." /><div className="mt-4"><Pagination page={pagination.page} pageSize={pagination.pageSize} total={pagination.total} onPageChange={setPage} /></div></>}
  </>;
}

export function MarketingCustomerPage() {
  const params = useParams<{ customerId: string }>(); const router = useRouter(); const customerId = params.customerId;
  const [customer, setCustomer] = useState<Customer | null>(null); const [products, setProducts] = useState<Product[]>([]); const [plans, setPlans] = useState<Plan[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [pending, setPending] = useState(false); const [formError, setFormError] = useState(''); const [serverErrors, setServerErrors] = useState<Record<string, string>>({}); const [notice, setNotice] = useState('');
  const [validUntil, setValidUntil] = useState(''); const [terms, setTerms] = useState(''); const [lines, setLines] = useState<{ productId: string; variantId: string; description: string; quantity: string; unitPrice: string }[]>([{ productId: '', variantId: '', description: '', quantity: '1', unitPrice: '0.00' }]);
  const load = useCallback(async () => { setLoading(true); setError(''); try { const [customerResult, productResult, planResult] = await Promise.all([apiRequest<Customer>(`/customers/${customerId}`), apiListRequest<Product>('/catalog/products?page=1&pageSize=100'), apiRequest<Plan[]>('/catalog/plans')]); setCustomer(customerResult); setProducts(productResult.data); setPlans(planResult); } catch (cause) { setError(displayError(cause)); } finally { setLoading(false); } }, [customerId]);
  useEffect(() => { void load(); }, [load]);
  async function createQuotation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return; setPending(true); setFormError(''); setServerErrors({}); setNotice('');
    try { const quotation = await apiRequest<Quotation>('/quotations', { method: 'POST', body: { customerId, validUntil: validUntil || null, terms: terms || null, lines: lines.map((line) => ({ productId: line.productId, ...(line.variantId ? { variantId: line.variantId } : {}), description: line.description, quantity: Number(line.quantity), unitPrice: line.unitPrice })) } }); router.push(`/marketing/quotations/${quotation.id}`); }
    catch (cause) { setFormError(displayError(cause)); setServerErrors(fieldErrors(cause)); }
    finally { setPending(false); }
  }
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={() => void load()} />;
  if (!customer) return <EmptyState title="Customer unavailable" />;
  return <><Title title={customer.legalName} description={`Billing contact: ${customer.billingEmail}`} />
    <section className="mb-8 grid gap-3 border-b border-slate-200 pb-6 sm:grid-cols-2"><p className="text-sm"><strong>Account:</strong> {customer.user?.firstName} {customer.user?.lastName ?? ''} · {customer.user?.email}</p><p className="text-sm"><strong>Customer record:</strong> {customer.id}</p></section>
    <section className="mb-8"><h2 className="text-lg font-semibold">Subscription history</h2><p className="mt-2 text-sm text-amber-900">No customer-scoped subscription list endpoint is available. Created or linked subscriptions can be opened from their quotation conversion result.</p></section>
    <section className="border-t border-slate-200 pt-6"><h2 className="text-lg font-semibold">New quotation</h2><p className="mt-1 text-sm text-amber-900">Quotation-template selection is unavailable because the template endpoints are not implemented. The current create endpoint accepts editable lines directly; totals are not returned.</p>
      {formError && <div className="mt-4"><ErrorState message={formError} /></div>}
      <form className="mt-4 space-y-4" onSubmit={(event) => void createQuotation(event)}>
        <div className="grid gap-4 sm:grid-cols-2"><FormField id="validUntil" label="Valid until"><Input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} /></FormField><FormField id="quotationTerms" label="Terms"><Input value={terms} onChange={(event) => setTerms(event.target.value)} maxLength={8000} /></FormField></div>
        {lines.map((line, index) => <fieldset key={index} className="grid gap-3 rounded-md border border-slate-200 p-3 sm:grid-cols-2"><legend className="px-1 text-sm font-medium">Line {index + 1}</legend>
          <FormField id={`product-${index}`} label="Product" error={serverErrors[`line-${index}-productId`]} required><Select value={line.productId} onChange={(event) => { const selected = products.find((product) => product.id === event.target.value); setLines(lines.map((item, position) => position === index ? { ...item, productId: event.target.value, variantId: '', description: selected?.name ?? item.description, unitPrice: selected?.salesPrice ?? item.unitPrice } : item)); }} required><option value="">Select product</option>{products.filter((product) => product.active).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</Select></FormField>
          {products.find((product) => product.id === line.productId)?.variants?.length ? <FormField id={`variant-${index}`} label="Variant" error={serverErrors[`line-${index}-variantId`]}><Select value={line.variantId} onChange={(event) => setLines(lines.map((item, position) => position === index ? { ...item, variantId: event.target.value } : item))}><option value="">No variant</option>{products.find((product) => product.id === line.productId)?.variants?.map((variant) => <option key={variant.id} value={variant.id}>{variant.sku ?? variant.id}</option>)}</Select></FormField> : null}
          <FormField id={`description-${index}`} label="Description" error={serverErrors[`line-${index}-description`]} required><Input value={line.description} onChange={(event) => setLines(lines.map((item, position) => position === index ? { ...item, description: event.target.value } : item))} required maxLength={500} /></FormField>
          <FormField id={`quantity-${index}`} label="Quantity" error={serverErrors[`line-${index}-quantity`]} required><Input type="number" min="1" step="1" value={line.quantity} onChange={(event) => setLines(lines.map((item, position) => position === index ? { ...item, quantity: event.target.value } : item))} required /></FormField>
          <FormField id={`unitPrice-${index}`} label="Unit price (INR)" description="String sent to server; server response does not currently include totals." error={serverErrors[`line-${index}-unitPrice`]} required><Input inputMode="decimal" pattern="^\\d+(\\.\\d{1,2})?$" value={line.unitPrice} onChange={(event) => setLines(lines.map((item, position) => position === index ? { ...item, unitPrice: event.target.value } : item))} required /></FormField>
          {lines.length > 1 && <Button type="button" variant="quiet" onClick={() => setLines(lines.filter((_, position) => position !== index))}>Remove line</Button>}
        </fieldset>)}
        {serverErrors.validUntil && <p className="text-sm text-red-700" role="alert">{serverErrors.validUntil}</p>}
        <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => setLines([...lines, { productId: '', variantId: '', description: '', quantity: '1', unitPrice: '0.00' }])}>Add line</Button><Button type="submit" disabled={pending || !products.length || lines.some((line) => !line.productId)}>{pending ? 'Creating…' : 'Create quotation'}</Button></div>
      </form>
    </section>
    {!plans.length && <p className="mt-4 text-sm text-amber-900">No plan data is available. Quotation conversion requires a real plan ID.</p>}
  </>;
}

export function MarketingQuotationPage() {
  const params = useParams<{ quotationId: string }>(); const router = useRouter(); const [quotation, setQuotation] = useState<Quotation | null>(null); const [plans, setPlans] = useState<Plan[]>([]); const [planId, setPlanId] = useState(''); const [startDate, setStartDate] = useState(''); const [expiryDate, setExpiryDate] = useState(''); const [paymentTerms, setPaymentTerms] = useState(''); const [loading, setLoading] = useState(true); const [pending, setPending] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { const [quote, planRows] = await Promise.all([apiRequest<Quotation>(`/quotations/${params.quotationId}`), apiRequest<Plan[]>('/catalog/plans')]); setQuotation(quote); setPlans(planRows); } catch (cause) { setError(displayError(cause)); } finally { setLoading(false); } }, [params.quotationId]);
  useEffect(() => { void load(); }, [load]);
  async function convert(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (pending || !quotation) return; setPending(true); setError(''); setNotice(''); try { const subscription = await apiRequest<Subscription>(`/quotations/${quotation.id}/accept`, { method: 'POST', body: { planId, startDate, expiryDate: expiryDate || null, paymentTerms: paymentTerms || null } }); router.push(`/marketing/subscriptions/${subscription.id}`); } catch (cause) { setError(displayError(cause)); } finally { setPending(false); } }
  if (loading) return <LoadingState />;
  if (error && !quotation) return <ErrorState message={error} retry={() => void load()} />;
  if (!quotation) return <EmptyState title="Quotation unavailable" />;
  return <><Title title={`Quotation ${quotation.number}`} description="Quotation state, validity and lines are read from the server." />
    <div className="mb-5 flex flex-wrap items-center gap-3"><Badge tone={quotation.status === 'ACCEPTED' ? 'success' : 'info'}>{quotation.status}</Badge><span className="text-sm text-slate-600">Valid until: {quotation.validUntil ?? 'Not set'}</span></div>
    {error && <div className="mb-4"><ErrorState message={error} retry={() => void load()} /></div>}{notice && <p className="mb-4 text-sm text-emerald-800" role="status">{notice}</p>}
    <section className="mb-6 rounded-md border border-slate-200 bg-white p-4"><h2 className="font-semibold">Terms</h2><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{quotation.terms || 'No terms recorded.'}</p><h2 className="mt-5 font-semibold">Lines</h2><ul className="mt-2 divide-y divide-slate-200">{quotation.lines.map((line) => <li key={line.id ?? `${line.productId}-${line.description}`} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span>{line.description} × {line.quantity}</span><span>INR {line.unitPrice} each</span></li>)}</ul><p className="mt-3 text-sm text-amber-900">The quotation API does not return a calculated subtotal or total; no browser total is shown.</p></section>
    {quotation.subscription ? <p className="text-sm">Converted to subscription <Link className="text-indigo-800 underline" href={`/marketing/subscriptions/${quotation.subscription.id}`}>{quotation.subscription.number}</Link></p> : ['DRAFT', 'SENT'].includes(quotation.status) && <form className="grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2" onSubmit={(event) => void convert(event)}><h2 className="sm:col-span-2 text-lg font-semibold">Convert accepted quotation</h2><FormField id="conversionPlan" label="Plan" required><Select value={planId} onChange={(event) => setPlanId(event.target.value)} required><option value="">Select plan</option>{plans.filter((plan) => plan.active).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · INR {plan.price}</option>)}</Select></FormField><FormField id="subscriptionStartDate" label="Start date" required><Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></FormField><FormField id="subscriptionExpiryDate" label="Expiry date"><Input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} /></FormField><FormField id="paymentTerms" label="Payment terms"><Input value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} maxLength={500} /></FormField><div className="sm:col-span-2"><Button type="submit" disabled={pending || !planId}>{pending ? 'Converting…' : 'Accept and create subscription'}</Button></div></form>}
    <p className="mt-4 text-sm text-amber-900">Quotation status history is not included in the current quotation response.</p>
  </>;
}

export function MarketingSubscriptionPage() {
  const params = useParams<{ subscriptionId: string }>(); const [subscription, setSubscription] = useState<Subscription | null>(null); const [loading, setLoading] = useState(true); const [pending, setPending] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setSubscription(await apiRequest<Subscription>(`/subscriptions/${params.subscriptionId}`)); } catch (cause) { setError(displayError(cause)); } finally { setLoading(false); } }, [params.subscriptionId]);
  useEffect(() => { void load(); }, [load]);
  async function act(action: 'ACTIVATE' | 'PAUSE' | 'RESUME' | 'CLOSE') { if (pending) return; setPending(true); setError(''); setNotice(''); try { await apiRequest(`/subscriptions/${params.subscriptionId}/actions`, { method: 'POST', body: { action } }); setNotice(`${action} accepted by the server.`); await load(); } catch (cause) { setError(displayError(cause)); } finally { setPending(false); } }
  if (loading) return <LoadingState />;
  if (error && !subscription) return <ErrorState message={error} retry={() => void load()} />;
  if (!subscription) return <EmptyState title="Subscription unavailable" />;
  const actions: { action: 'ACTIVATE' | 'PAUSE' | 'RESUME' | 'CLOSE'; label: string; permitted: boolean }[] = [
    { action: 'ACTIVATE', label: 'Activate', permitted: subscription.status === 'CONFIRMED' },
    { action: 'PAUSE', label: 'Pause', permitted: subscription.status === 'ACTIVE' && subscription.plan.allowPause },
    { action: 'RESUME', label: 'Resume', permitted: subscription.status === 'PAUSED' && subscription.plan.allowRenewal },
    { action: 'CLOSE', label: 'Close', permitted: ['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED'].includes(subscription.status) && subscription.plan.allowEarlyClosure },
  ];
  return <><Title title={`Subscription ${subscription.number}`} description="Status and event history are read from the API." />
    {error && <div className="mb-4"><ErrorState message={error} retry={() => void load()} /></div>}{notice && <p className="mb-4 text-sm text-emerald-800" role="status">{notice}</p>}
    <div className="mb-6 grid gap-3 rounded-md border border-slate-200 bg-white p-4 sm:grid-cols-2"><p><strong>Status:</strong> {subscription.status}</p><p><strong>Plan:</strong> {subscription.plan.name}</p><p><strong>Starts:</strong> {subscription.startDate.slice(0, 10)}</p><p><strong>Expires:</strong> {subscription.expiryDate?.slice(0, 10) ?? 'No end date'}</p></div>
    <section className="mb-6"><h2 className="text-lg font-semibold">Lifecycle</h2><p className="mt-1 text-sm text-slate-600">Pauses are recorded by the server. Current action API does not return a billing-boundary effective date.</p><div className="mt-3 flex flex-wrap gap-2">{actions.filter((item) => item.permitted).map((item) => <Button key={item.action} variant={item.action === 'CLOSE' ? 'danger' : 'secondary'} disabled={pending} onClick={() => void act(item.action)}>{pending ? 'Saving…' : item.label}</Button>)}</div></section>
    <section className="mb-6"><h2 className="text-lg font-semibold">Subscription lines</h2><ul className="mt-2 divide-y divide-slate-200">{subscription.lines.map((line) => <li key={line.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span>{line.description} · qty {line.quantity}{line.isAddon ? ' · add-on' : ''}</span><span>INR {line.agreedPrice}</span></li>)}</ul><p className="mt-3 text-sm text-amber-900">Next-period quantity/add-on changes are not exposed by the current API. No immediate edit is offered.</p></section>
    <section><h2 className="text-lg font-semibold">Status history</h2>{subscription.logs.length ? <ol className="mt-2 space-y-2">{subscription.logs.map((log, index) => <li key={`${log.status}-${log.createdAt}-${index}`} className="border-l-2 border-indigo-300 pl-3 text-sm"><strong>{log.status}</strong> · {log.note ?? 'Status updated'} · {log.effectiveAt ?? log.createdAt}</li>)}</ol> : <EmptyState title="No history returned" />}</section>
  </>;
}