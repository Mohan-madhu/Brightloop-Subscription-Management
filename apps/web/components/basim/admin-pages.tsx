'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiListRequest, apiRequest, ApiClientError, type ApiPagination } from '../../lib/api';
import { Badge, Button, EmptyState, ErrorState, FormField, Input, LoadingState, Pagination, Select, Table, type TableColumn } from '../shared/ui';

type Product = { id: string; name: string; type: string; salesPrice: string; costPrice: string; notes: string | null; active: boolean; variants?: Variant[] };
type Variant = { id: string; sku: string | null; priceAdjustment: string; attributes?: { value: string; attribute: { name: string } }[] };
type PlanProduct = { productId: string; variantId?: string | null; isAddon: boolean; price: string };
type Plan = { id: string; name: string; billingIntervalId: string; billingInterval?: { id: string; name: string; unit: string; count: number }; price: string; minimumQuantity: number; availableFrom: string | null; availableUntil: string | null; allowEarlyClosure: boolean; allowPause: boolean; allowRenewal: boolean; allowEndDateClosure: boolean; active: boolean; products?: (PlanProduct & { product?: Product })[] };
type TaxRule = { id: string; name: string; rate: string; taxExclusive: boolean; active: boolean };
type Discount = { id: string; code: string; kind: 'FIXED' | 'PERCENTAGE'; amount: string; minimumPurchase: string | null; minimumQuantity: number | null; startsAt: string | null; endsAt: string | null; usageLimit: number | null; active: boolean; targets?: { productId: string | null; variantId: string | null; planId: string | null }[] };
type BillingInterval = { id: string; code: string; name: string; unit: string; count: number; active: boolean };
type StaffResult = { id: string; email: string; firstName: string; lastName: string | null; kind: string };
type Section = 'products' | 'plans' | 'taxes' | 'discounts' | 'staff';
type ServerFieldError = Record<string, string>;

const emptyProduct = { name: '', type: '', salesPrice: '0.00', costPrice: '0.00', notes: '', active: true };
const emptyPlan = { name: '', billingIntervalId: '', price: '0.00', minimumQuantity: '1', availableFrom: '', availableUntil: '', allowEarlyClosure: false, allowPause: false, allowRenewal: true, allowEndDateClosure: true, active: true };
const emptyTax = { name: '', rate: '18.00', taxExclusive: true, active: true };
const emptyDiscount: { code: string; kind: 'FIXED' | 'PERCENTAGE'; amount: string; minimumPurchase: string; minimumQuantity: string; startsAt: string; endsAt: string; usageLimit: string; active: boolean; targetType: string; targetId: string } = { code: '', kind: 'FIXED', amount: '0.00', minimumPurchase: '', minimumQuantity: '', startsAt: '', endsAt: '', usageLimit: '', active: true, targetType: '', targetId: '' };

function fieldErrors(error: unknown): ServerFieldError {
  if (!(error instanceof ApiClientError) || !Array.isArray(error.details)) return {};
  return Object.fromEntries(error.details.flatMap((item) => typeof item === 'object' && item !== null && 'path' in item && 'message' in item ? [[String(item.path).split('.')[0], String(item.message)]] : []));
}

function errorText(cause: unknown): string {
  if (cause instanceof ApiClientError && cause.status === 403) return 'Your account is not permitted to perform this action.';
  return cause instanceof Error ? cause.message : 'The request could not be completed.';
}

function PageTitle({ title, description }: { title: string; description: string }) {
  return <header className="mb-7"><p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-700">Brightloop · Administration</p><h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p></header>;
}

export function AdminCatalogPage({ section }: { section: Exclude<Section, 'staff'> }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [intervals, setIntervals] = useState<BillingInterval[]>([]);
  const [taxes, setTaxes] = useState<TaxRule[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [pagination, setPagination] = useState<ApiPagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const [fieldError, setFieldError] = useState<ServerFieldError>({});
  const [editing, setEditing] = useState<Product | Plan | TaxRule | Discount | null>(null);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [planForm, setPlanForm] = useState(emptyPlan);
  const [planLines, setPlanLines] = useState<PlanProduct[]>([]);
  const [taxForm, setTaxForm] = useState(emptyTax);
  const [discountForm, setDiscountForm] = useState(emptyDiscount);
  const [variantProductId, setVariantProductId] = useState('');
  const [variantForm, setVariantForm] = useState({ sku: '', priceAdjustment: '0.00', attributes: [{ name: '', value: '' }] });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (section === 'products') {
        const query = new URLSearchParams({ page: String(page), pageSize: '20', sortBy: 'name', sortOrder: 'asc' });
        if (search.trim()) query.set('search', search.trim());
        const result = await apiListRequest<Product>(`/catalog/products?${query}`);
        setProducts(result.data); setPagination(result.pagination);
      } else if (section === 'plans') {
        const [planRows, productRows, intervalRows] = await Promise.all([apiListRequest<Plan>(`/catalog/plans?page=${page}&pageSize=20&sortBy=name&sortOrder=asc${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''}`), apiListRequest<Product>('/catalog/products?page=1&pageSize=100'), apiListRequest<BillingInterval>('/catalog/billing-intervals?page=1&pageSize=100')]);
        setPlans(planRows.data); setPagination(planRows.pagination); setProducts(productRows.data); setIntervals(intervalRows.data);
      }
      else if (section === 'taxes') { const result = await apiListRequest<TaxRule>(`/catalog/taxes?page=${page}&pageSize=20&sortBy=name&sortOrder=asc${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''}`); setTaxes(result.data); setPagination(result.pagination); }
      else {
        const [discountRows, productRows] = await Promise.all([apiListRequest<Discount>(`/catalog/discounts?page=${page}&pageSize=20&sortBy=code&sortOrder=asc${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''}`), apiListRequest<Product>('/catalog/products?page=1&pageSize=100')]);
        setDiscounts(discountRows.data); setPagination(discountRows.pagination); setProducts(productRows.data);
      }
    } catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  }, [page, search, section]);

  useEffect(() => { void load(); }, [load]);

  function startEdit(value: Product | Plan | TaxRule | Discount) {
    setEditing(value); setFieldError({}); setNotice('');
    if (section === 'products') {
      const item = value as Product; setProductForm({ name: item.name, type: item.type, salesPrice: String(item.salesPrice), costPrice: String(item.costPrice), notes: item.notes ?? '', active: item.active });
    } else if (section === 'plans') {
      const item = value as Plan;
      setPlanForm({ name: item.name, billingIntervalId: item.billingIntervalId, price: String(item.price), minimumQuantity: String(item.minimumQuantity), availableFrom: item.availableFrom?.slice(0, 10) ?? '', availableUntil: item.availableUntil?.slice(0, 10) ?? '', allowEarlyClosure: item.allowEarlyClosure, allowPause: item.allowPause, allowRenewal: item.allowRenewal, allowEndDateClosure: item.allowEndDateClosure, active: item.active });
      setPlanLines((item.products ?? []).map((line) => ({ productId: line.productId, variantId: line.variantId, isAddon: line.isAddon, price: String(line.price) })));
    } else if (section === 'taxes') {
      const item = value as TaxRule; setTaxForm({ name: item.name, rate: String(item.rate), taxExclusive: item.taxExclusive, active: item.active });
    } else {
      const item = value as Discount; setDiscountForm({ code: item.code, kind: item.kind, amount: String(item.amount), minimumPurchase: item.minimumPurchase ?? '', minimumQuantity: item.minimumQuantity == null ? '' : String(item.minimumQuantity), startsAt: item.startsAt?.slice(0, 16) ?? '', endsAt: item.endsAt?.slice(0, 16) ?? '', usageLimit: item.usageLimit == null ? '' : String(item.usageLimit), active: item.active, targetType: item.targets?.[0]?.productId ? 'productId' : item.targets?.[0]?.variantId ? 'variantId' : item.targets?.[0]?.planId ? 'planId' : '', targetId: item.targets?.[0]?.productId ?? item.targets?.[0]?.variantId ?? item.targets?.[0]?.planId ?? '' });
    }
  }

  function resetForm() {
    setEditing(null); setFieldError({});
    setProductForm(emptyProduct); setPlanForm(emptyPlan); setPlanLines([]); setTaxForm(emptyTax); setDiscountForm(emptyDiscount);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    setPending(true); setError(''); setNotice(''); setFieldError({});
    const id = editing?.id;
    try {
      if (section === 'products') {
        const body = { ...productForm, notes: productForm.notes || null };
        await apiRequest(`/catalog/products${id ? `/${id}` : ''}`, { method: id ? 'PATCH' : 'POST', body });
      } else if (section === 'plans') {
        if (!planLines.length || planLines.some((line) => !line.productId)) throw new Error('Add at least one product or add-on and select a product for every line.');
        const body = { ...planForm, minimumQuantity: Number(planForm.minimumQuantity), availableFrom: planForm.availableFrom || null, availableUntil: planForm.availableUntil || null, products: planLines };
        await apiRequest(`/catalog/plans${id ? `/${id}` : ''}`, { method: id ? 'PATCH' : 'POST', body });
      } else if (section === 'taxes') {
        await apiRequest(`/catalog/taxes${id ? `/${id}` : ''}`, { method: id ? 'PATCH' : 'POST', body: taxForm });
      } else {
        const { targetType, targetId, ...fields } = discountForm;
        if (targetType && !targetId) throw new Error('Select a target or clear the target type.');
        const body = { ...fields, minimumPurchase: fields.minimumPurchase || null, minimumQuantity: fields.minimumQuantity ? Number(fields.minimumQuantity) : null, startsAt: fields.startsAt ? new Date(fields.startsAt).toISOString() : null, endsAt: fields.endsAt ? new Date(fields.endsAt).toISOString() : null, usageLimit: fields.usageLimit ? Number(fields.usageLimit) : null, targets: targetType && targetId ? [{ productId: targetType === 'productId' ? targetId : null, variantId: targetType === 'variantId' ? targetId : null, planId: targetType === 'planId' ? targetId : null }] : [] };
        await apiRequest(`/catalog/discounts${id ? `/${id}` : ''}`, { method: id ? 'PATCH' : 'POST', body });
      }
      resetForm(); setNotice('Saved.'); await load();
    } catch (cause) { setError(errorText(cause)); setFieldError(fieldErrors(cause)); }
    finally { setPending(false); }
  }

  const title = { products: 'Products and variants', plans: 'Plans and add-ons', taxes: 'Tax rules', discounts: 'Discounts' }[section];
  const descriptions = {
    products: 'Manage product prices and variants. Prices are submitted as decimal strings.',
    plans: 'Configure intervals, minimum quantities, availability and lifecycle rules.',
    taxes: 'Configure tax rates. Target-specific applicability is not supported by the current API.',
    discounts: 'Configure eligibility, usage limits and product, variant or plan targets.',
  };

  const productColumns: TableColumn<Product>[] = [
    { key: 'name', header: 'Product', render: (item) => <><strong>{item.name}</strong><p className="text-xs text-slate-600">{item.type}</p></> },
    { key: 'prices', header: 'Sales / cost', render: (item) => <span className="whitespace-nowrap">INR {item.salesPrice} / {item.costPrice}</span> },
    { key: 'variants', header: 'Variants', render: (item) => <span>{item.variants?.length ?? 0}</span> },
    { key: 'active', header: 'State', render: (item) => <Badge tone={item.active ? 'success' : 'neutral'}>{item.active ? 'Active' : 'Archived'}</Badge> },
    { key: 'actions', header: 'Actions', render: (item) => <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => startEdit(item)}>Edit</Button><Button variant="secondary" onClick={() => { setVariantProductId(item.id); setVariantForm({ sku: '', priceAdjustment: '0.00', attributes: [{ name: '', value: '' }] }); }}>Add variant</Button></div> },
  ];
  const planColumns: TableColumn<Plan>[] = [
    { key: 'name', header: 'Plan', render: (item) => <><strong>{item.name}</strong><p className="text-xs text-slate-600">{item.billingInterval?.name ?? item.billingIntervalId}</p></> },
    { key: 'price', header: 'Price', render: (item) => `INR ${item.price}` },
    { key: 'quantity', header: 'Minimum', render: (item) => item.minimumQuantity },
    { key: 'lines', header: 'Plan / add-ons', render: (item) => item.products?.map((line) => `${line.isAddon ? 'Add-on' : 'Plan'}: ${line.product?.name ?? line.productId}`).join(', ') ?? '—' },
    { key: 'state', header: 'State', render: (item) => <Badge tone={item.active ? 'success' : 'neutral'}>{item.active ? 'Active' : 'Archived'}</Badge> },
    { key: 'actions', header: 'Actions', render: (item) => <Button variant="secondary" onClick={() => startEdit(item)}>Edit</Button> },
  ];
  const taxColumns: TableColumn<TaxRule>[] = [
    { key: 'name', header: 'Name', render: (item) => item.name }, { key: 'rate', header: 'Rate', render: (item) => `${item.rate}%` }, { key: 'mode', header: 'Calculation', render: (item) => item.taxExclusive ? 'Tax exclusive' : 'Tax inclusive' }, { key: 'active', header: 'State', render: (item) => item.active ? 'Active' : 'Inactive' }, { key: 'actions', header: 'Actions', render: (item) => <Button variant="secondary" onClick={() => startEdit(item)}>Edit</Button> },
  ];
  const discountColumns: TableColumn<Discount>[] = [
    { key: 'code', header: 'Code', render: (item) => item.code }, { key: 'type', header: 'Discount', render: (item) => `${item.kind === 'FIXED' ? 'INR ' : ''}${item.amount}${item.kind === 'PERCENTAGE' ? '%' : ''}` }, { key: 'limits', header: 'Limits', render: (item) => [item.minimumPurchase && `min INR ${item.minimumPurchase}`, item.minimumQuantity && `qty ${item.minimumQuantity}`, item.usageLimit && `uses ${item.usageLimit}`].filter(Boolean).join(' · ') || 'None' }, { key: 'targets', header: 'Targets', render: (item) => item.targets?.map((target) => target.productId ? 'Product' : target.variantId ? 'Variant' : target.planId ? 'Plan' : 'Unresolved').join(', ') || 'Global / none' }, { key: 'actions', header: 'Actions', render: (item) => <Button variant="secondary" onClick={() => startEdit(item)}>Edit</Button> },
  ];

  return <>
    <PageTitle title={title} description={descriptions[section]} />
    {error && <div className="mb-4"><ErrorState message={error} retry={() => void load()} /></div>}
    {notice && <p className="mb-4 text-sm text-emerald-800" role="status">{notice}</p>}
    <section className="mb-6 border-b border-slate-200 pb-6">
      <h2 className="mb-4 text-lg font-semibold">{editing ? 'Edit record' : `Create ${section === 'products' ? 'product' : section === 'plans' ? 'plan' : section === 'taxes' ? 'tax rule' : 'discount'}`}</h2>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => void submit(event)}>
        {(section === 'products' || section === 'plans' || section === 'taxes' || section === 'discounts') && <FormField id="name" label={section === 'discounts' ? 'Discount code' : 'Name'} error={section === 'discounts' ? fieldError.code : fieldError.name} required><Input value={section === 'products' ? productForm.name : section === 'plans' ? planForm.name : section === 'taxes' ? taxForm.name : discountForm.code} onChange={(event) => section === 'products' ? setProductForm({ ...productForm, name: event.target.value }) : section === 'plans' ? setPlanForm({ ...planForm, name: event.target.value }) : section === 'taxes' ? setTaxForm({ ...taxForm, name: event.target.value }) : setDiscountForm({ ...discountForm, code: event.target.value })} required /></FormField>}
        {section === 'products' && <>
          <FormField id="type" label="Product type" error={fieldError.type} required><Input value={productForm.type} onChange={(event) => setProductForm({ ...productForm, type: event.target.value })} required /></FormField>
          <FormField id="salesPrice" label="Sales price (INR)" error={fieldError.salesPrice} required><Input inputMode="decimal" pattern="^\\d+(\\.\\d{1,2})?$" value={productForm.salesPrice} onChange={(event) => setProductForm({ ...productForm, salesPrice: event.target.value })} required /></FormField>
          <FormField id="costPrice" label="Cost price (INR)" error={fieldError.costPrice} required><Input inputMode="decimal" pattern="^\\d+(\\.\\d{1,2})?$" value={productForm.costPrice} onChange={(event) => setProductForm({ ...productForm, costPrice: event.target.value })} required /></FormField>
          <FormField id="notes" label="Notes" error={fieldError.notes}><Input value={productForm.notes} onChange={(event) => setProductForm({ ...productForm, notes: event.target.value })} /></FormField>
          <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={productForm.active} onChange={(event) => setProductForm({ ...productForm, active: event.target.checked })} />Active (clear to archive)</label>
        </>}
        {section === 'plans' && <>
          <FormField id="billingIntervalId" label="Billing interval" error={fieldError.billingIntervalId} required><Select value={planForm.billingIntervalId} onChange={(event) => setPlanForm({ ...planForm, billingIntervalId: event.target.value })} required><option value="">Select interval</option>{intervals.filter((interval) => interval.active).map((interval) => <option key={interval.id} value={interval.id}>{interval.name} ({interval.count} {interval.unit})</option>)}</Select></FormField>
          <FormField id="planPrice" label="Plan price (INR)" error={fieldError.price} required><Input inputMode="decimal" pattern="^\\d+(\\.\\d{1,2})?$" value={planForm.price} onChange={(event) => setPlanForm({ ...planForm, price: event.target.value })} required /></FormField>
          <FormField id="minimumQuantity" label="Minimum quantity" error={fieldError.minimumQuantity} required><Input type="number" min="1" step="1" value={planForm.minimumQuantity} onChange={(event) => setPlanForm({ ...planForm, minimumQuantity: event.target.value })} required /></FormField>
          <FormField id="availableFrom" label="Available from"><Input type="date" value={planForm.availableFrom} onChange={(event) => setPlanForm({ ...planForm, availableFrom: event.target.value })} /></FormField>
          <FormField id="availableUntil" label="Available until"><Input type="date" value={planForm.availableUntil} onChange={(event) => setPlanForm({ ...planForm, availableUntil: event.target.value })} /></FormField>
          <fieldset className="sm:col-span-2"><legend className="mb-2 text-sm font-medium">Lifecycle options</legend><div className="grid gap-2 sm:grid-cols-2">{([['allowPause', 'Allow pause'], ['allowEarlyClosure', 'Allow early closure'], ['allowRenewal', 'Allow renewal'], ['allowEndDateClosure', 'Close at end date']] as const).map(([key, label]) => <label key={key} className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={planForm[key]} onChange={(event) => setPlanForm({ ...planForm, [key]: event.target.checked })} />{label}</label>)}</div></fieldset>
          <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={planForm.active} onChange={(event) => setPlanForm({ ...planForm, active: event.target.checked })} />Active (clear to archive)</label>
          <fieldset className="sm:col-span-2"><legend className="mb-2 text-sm font-medium">Products and optional add-ons</legend><div className="space-y-3">{planLines.map((line, index) => <div key={`${line.productId}-${index}`} className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-[minmax(0,1fr)_9rem_auto_auto]"><Select aria-label={`Line ${index + 1} product`} value={line.productId} onChange={(event) => setPlanLines(planLines.map((current, position) => position === index ? { ...current, productId: event.target.value } : current))}><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</Select><Input aria-label={`Line ${index + 1} price`} inputMode="decimal" value={line.price} onChange={(event) => setPlanLines(planLines.map((current, position) => position === index ? { ...current, price: event.target.value } : current))} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={line.isAddon} onChange={(event) => setPlanLines(planLines.map((current, position) => position === index ? { ...current, isAddon: event.target.checked } : current))} />Add-on</label><Button type="button" variant="quiet" onClick={() => setPlanLines(planLines.filter((_, position) => position !== index))}>Remove</Button></div>)}</div><Button type="button" className="mt-3" variant="secondary" onClick={() => setPlanLines([...planLines, { productId: '', isAddon: true, price: '0.00' }])}>Add line</Button></fieldset>
        </>}
        {section === 'taxes' && <>
          <FormField id="taxRate" label="Rate (%)" error={fieldError.rate} required><Input inputMode="decimal" value={taxForm.rate} onChange={(event) => setTaxForm({ ...taxForm, rate: event.target.value })} required /></FormField>
          <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={taxForm.taxExclusive} onChange={(event) => setTaxForm({ ...taxForm, taxExclusive: event.target.checked })} />Tax exclusive</label>
          <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={taxForm.active} onChange={(event) => setTaxForm({ ...taxForm, active: event.target.checked })} />Active</label>
          <p className="sm:col-span-2 text-sm text-amber-900">The current endpoint accepts only name, rate, taxExclusive, and active; target mapping is unavailable.</p>
        </>}
        {section === 'discounts' && <>
          <FormField id="kind" label="Discount type" required><Select value={discountForm.kind} onChange={(event) => setDiscountForm({ ...discountForm, kind: event.target.value as 'FIXED' | 'PERCENTAGE' })}><option value="FIXED">Fixed amount (INR)</option><option value="PERCENTAGE">Percentage</option></Select></FormField>
          <FormField id="discountAmount" label="Amount" error={fieldError.amount} required><Input inputMode="decimal" value={discountForm.amount} onChange={(event) => setDiscountForm({ ...discountForm, amount: event.target.value })} required /></FormField>
          <FormField id="minimumPurchase" label="Minimum purchase (INR)"><Input inputMode="decimal" value={discountForm.minimumPurchase} onChange={(event) => setDiscountForm({ ...discountForm, minimumPurchase: event.target.value })} /></FormField>
          <FormField id="minimumQuantity" label="Minimum quantity"><Input type="number" min="1" value={discountForm.minimumQuantity} onChange={(event) => setDiscountForm({ ...discountForm, minimumQuantity: event.target.value })} /></FormField>
          <FormField id="usageLimit" label="Usage limit"><Input type="number" min="1" value={discountForm.usageLimit} onChange={(event) => setDiscountForm({ ...discountForm, usageLimit: event.target.value })} /></FormField>
          <FormField id="startsAt" label="Starts at"><Input type="datetime-local" value={discountForm.startsAt} onChange={(event) => setDiscountForm({ ...discountForm, startsAt: event.target.value })} /></FormField>
          <FormField id="endsAt" label="Ends at"><Input type="datetime-local" value={discountForm.endsAt} onChange={(event) => setDiscountForm({ ...discountForm, endsAt: event.target.value })} /></FormField>
          <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={discountForm.active} onChange={(event) => setDiscountForm({ ...discountForm, active: event.target.checked })} />Active</label>
          <FormField id="targetType" label="Target type"><Select value={discountForm.targetType} onChange={(event) => setDiscountForm({ ...discountForm, targetType: event.target.value, targetId: '' })}><option value="">No explicit target</option><option value="productId">Product</option><option value="variantId">Variant</option><option value="planId">Plan</option></Select></FormField>
          {discountForm.targetType && <FormField id="targetId" label="Target" error={fieldError.targets}><Select value={discountForm.targetId} onChange={(event) => setDiscountForm({ ...discountForm, targetId: event.target.value })}><option value="">Select target</option>{discountForm.targetType === 'productId' ? products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>) : discountForm.targetType === 'planId' ? plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>) : products.flatMap((product) => (product.variants ?? []).map((variant) => <option key={variant.id} value={variant.id}>{product.name} · {variant.sku ?? variant.id}</option>))}</Select></FormField>}
          <p className="sm:col-span-2 text-sm text-amber-900">Global and subscription targets are not represented by the current contract/schema.</p>
        </>}
        <div className="sm:col-span-2 flex flex-wrap gap-2"><Button type="submit" disabled={pending || (section === 'plans' && (!planForm.billingIntervalId || planLines.length === 0 || planLines.some((line) => !line.productId))) || (section === 'discounts' && Boolean(discountForm.targetType) && !discountForm.targetId)}>{pending ? 'Saving…' : editing ? 'Save changes' : 'Create'}</Button>{editing && <Button type="button" variant="secondary" onClick={resetForm}>Cancel edit</Button>}</div>
      </form>
    </section>
    {section === 'products' && <div className="mb-4 max-w-md"><FormField id="productSearch" label="Search products"><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by product name" /></FormField></div>}
    {loading ? <LoadingState /> : section === 'products' ? <><Table caption="Products" columns={productColumns} rows={products} getRowKey={(item) => item.id} emptyMessage="No products match this search." /><div className="mt-4"><Pagination page={pagination.page} pageSize={pagination.pageSize} total={pagination.total} onPageChange={setPage} /></div></> : section === 'plans' ? <Table caption="Plans" columns={planColumns} rows={plans} getRowKey={(item) => item.id} emptyMessage="No plans are configured." /> : section === 'taxes' ? <Table caption="Tax rules" columns={taxColumns} rows={taxes} getRowKey={(item) => item.id} emptyMessage="No tax rules are configured." /> : <Table caption="Discounts" columns={discountColumns} rows={discounts} getRowKey={(item) => item.id} emptyMessage="No discounts are configured." />}
    {section === 'plans' && <p className="mt-4 text-sm text-amber-900">Plans are currently returned as an unpaginated array. The backend does not expose a billing-interval administration/list endpoint; a new interval cannot be selected unless an existing plan reveals its interval ID. {plans.length === 0 && 'No interval ID is available, so plan creation is disabled.'}</p>}
    {section === 'taxes' && <p className="mt-4 text-sm text-amber-900">Tax listing is currently an unpaginated array and target applicability cannot be configured through this endpoint.</p>}
    {section === 'discounts' && <p className="mt-4 text-sm text-amber-900">Discount listing is currently an unpaginated array. Only product, variant, or plan targets are supported by the API.</p>}
    {variantProductId && <section className="mt-6 border-t border-slate-200 pt-6"><h2 className="text-lg font-semibold">Add product variant</h2><form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); if (pending) return; setPending(true); setError(''); void apiRequest(`/catalog/products/${variantProductId}/variants`, { method: 'POST', body: { sku: variantForm.sku || null, priceAdjustment: variantForm.priceAdjustment, attributes: variantForm.attributes } }).then(async () => { setVariantProductId(''); setNotice('Variant saved.'); await load(); }).catch((cause) => { setError(errorText(cause)); setFieldError(fieldErrors(cause)); }).finally(() => setPending(false)); }}>
      <FormField id="variantSku" label="SKU"><Input value={variantForm.sku} onChange={(event) => setVariantForm({ ...variantForm, sku: event.target.value })} /></FormField><FormField id="priceAdjustment" label="Price adjustment (INR)" required><Input inputMode="decimal" value={variantForm.priceAdjustment} onChange={(event) => setVariantForm({ ...variantForm, priceAdjustment: event.target.value })} required /></FormField>
      {variantForm.attributes.map((attribute, index) => <div key={index} className="grid grid-cols-2 gap-3"><FormField id={`attributeName-${index}`} label="Attribute" required><Input value={attribute.name} onChange={(event) => setVariantForm({ ...variantForm, attributes: variantForm.attributes.map((item, position) => position === index ? { ...item, name: event.target.value } : item) })} required /></FormField><FormField id={`attributeValue-${index}`} label="Value" required><Input value={attribute.value} onChange={(event) => setVariantForm({ ...variantForm, attributes: variantForm.attributes.map((item, position) => position === index ? { ...item, value: event.target.value } : item) })} required /></FormField></div>)}
      <div className="sm:col-span-2 flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => setVariantForm({ ...variantForm, attributes: [...variantForm.attributes, { name: '', value: '' }] })}>Add attribute</Button><Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Create variant'}</Button><Button type="button" variant="quiet" onClick={() => setVariantProductId('')}>Cancel</Button></div>
      <p className="sm:col-span-2 text-sm text-amber-900">Variant editing and standalone attribute management have no backend endpoints.</p>
    </form></section>}
  </>;
}

export function AdminStaffPage() {
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', password: '', roles: [] as string[] });
  const [pending, setPending] = useState(false); const [error, setError] = useState(''); const [fieldError, setFieldError] = useState<ServerFieldError>({}); const [created, setCreated] = useState<StaffResult | null>(null);
  function toggleRole(role: string) { setForm((value) => ({ ...value, roles: value.roles.includes(role) ? value.roles.filter((item) => item !== role) : [...value.roles, role] })); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return; setPending(true); setError(''); setFieldError({}); setCreated(null);
    try { setCreated(await apiRequest<StaffResult>('/staff', { method: 'POST', body: { email: form.email, firstName: form.firstName, ...(form.lastName ? { lastName: form.lastName } : {}), password: form.password, roles: form.roles } })); setForm({ email: '', firstName: '', lastName: '', password: '', roles: [] }); }
    catch (cause) { setError(errorText(cause)); setFieldError(fieldErrors(cause)); }
    finally { setPending(false); }
  }
  return <><PageTitle title="Staff access" description="Create staff accounts and assign one or both supported staff roles. Staff activation depends on server email delivery." />
    {error && <div className="mb-4"><ErrorState message={error} /></div>}{created && <p role="status" className="mb-4 text-sm text-emerald-800">Staff account created for {created.email}. An activation message is queued by the server; delivery is not confirmed by this response.</p>}
    <form className="grid max-w-2xl gap-4 sm:grid-cols-2" onSubmit={(event) => void submit(event)}>
      <FormField id="staffEmail" label="Email" error={fieldError.email} required><Input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required maxLength={320} /></FormField>
      <FormField id="staffFirstName" label="First name" error={fieldError.firstName} required><Input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} required maxLength={100} /></FormField>
      <FormField id="staffLastName" label="Last name"><Input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} maxLength={100} /></FormField>
      <FormField id="staffPassword" label="Temporary password" description="9+ characters with uppercase, lowercase and a special character." error={fieldError.password} required><Input type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></FormField>
      <fieldset className="sm:col-span-2"><legend className="mb-2 text-sm font-medium">Staff roles</legend><div className="flex gap-6">{['MARKETING', 'FINANCE'].map((role) => <label key={role} className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={form.roles.includes(role)} onChange={() => toggleRole(role)} />{role}</label>)}</div>{fieldError.roles && <p role="alert" className="text-sm text-red-700">{fieldError.roles}</p>}</fieldset>
      <div className="sm:col-span-2"><Button type="submit" disabled={pending || !form.roles.length}>{pending ? 'Creating…' : 'Create staff account'}</Button></div>
    </form>
    <EmptyState title="No staff directory endpoint" description="The backend currently supports staff creation only; it does not expose a staff list, edit, or role-update route." />
  </>;
}
