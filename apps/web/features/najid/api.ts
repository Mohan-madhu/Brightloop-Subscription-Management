import { apiListRequest, apiRequest } from '../../lib/api';
import type {
  DateRange, FinanceDashboardView, InvoiceDetailView,
  InvoiceQuery, InvoiceSummary, KanbanBucketView, PageInfo, PaymentView,
  QuarterlyReportView, SubscriptionView,
} from './types';

type InvoiceApi = {
  id: string; number: string; customerId: string; customerName: string | null;
  status: string; overdue?: boolean; currency: 'INR'; dueDate: string;
  total: string; balance: string; createdAt: string;
};
type PaymentApi = {
  id: string; invoiceId: string; invoiceNumber?: string | null; method: string;
  amount: string; paidAt: string; note: string | null; providerPaymentId: string | null;
  status: string; logs?: Array<{ id: string; status: string; note: string | null; createdAt: string }>;
};
type InvoiceDetailApi = InvoiceApi & {
  customerSnapshot: { legalName?: string | null; billingEmail?: string | null; billingAddress?: unknown };
  subtotal: string; discountTotal: string; taxTotal: string;
  lines: Array<{ id: string; description: string; quantity: number; unitPrice: string; discountAmount: string; lineTotal: string; taxes: Array<{ id: string; name: string; rate: string; amount: string }> }>;
  logs: Array<{ id: string; status: string; note: string | null; createdAt: string }>;
  payments: PaymentApi[];
};
type DashboardApi = {
  range: DateRange; activeSubscriptions: number; invoicedAmount: string;
  collectedAmount: string; outstandingBalance: string; overdueBalance: string;
  overdueInvoiceCount: number;
};
type KanbanSummaryApi = { today: string; buckets: Array<{ bucket: string; label: string; count: number; balance: string }> };
type SubscriptionApi = {
  id: string; number: string; status: string; startDate: string; expiryDate: string | null;
  version: number; plan: { name: string; price: string; allowPause: boolean; allowRenewal: boolean; allowEarlyClosure: boolean; allowEndDateClosure: boolean };
  lines: Array<{ id: string; productId?: string; variantId?: string | null; description: string; quantity: number; agreedPrice: string; isAddon: boolean }>;
  logs: Array<{ id: string; status: string; note: string | null; effectiveAt: string | null; createdAt: string }>;
};
type CustomerApi = { id: string; legalName: string; billingEmail: string; billingAddress: unknown; version: number; user?: { email: string; firstName: string; lastName: string | null } };
type QuarterlyApi = { id: string; reportType: string; periodKey: string; status: string; startedAt: string | null; completedAt: string | null; createdAt: string | null; metadata: unknown };
type OrderApi = { provider: string; keyId: string; orderId: string; invoiceId: string; invoiceNumber: string; amount: string; amountPaise: number; currency: 'INR' };

function invoiceSummary(item: InvoiceApi): InvoiceSummary {
  return { id: item.id, number: item.number, customerName: item.customerName ?? 'Customer name unavailable', issueDate: item.createdAt, dueDate: item.dueDate, currency: item.currency, status: item.status, overdue: item.overdue, total: item.total, balance: item.balance };
}
function paymentView(p: PaymentApi): PaymentView { return { id: p.id, amount: p.amount, method: p.method, status: p.status, paidAt: p.paidAt, note: p.note, reference: p.providerPaymentId, invoiceNumber: p.invoiceNumber }; }
function addressText(address: unknown): string | null {
  if (typeof address === 'string') return address;
  if (address && typeof address === 'object') return Object.entries(address).map(([key, value]) => `${key}: ${String(value)}`).join('\n');
  return null;
}
function invoiceDetail(item: InvoiceDetailApi): InvoiceDetailView {
  return {
    ...invoiceSummary(item), customerName: item.customerSnapshot.legalName ?? item.customerName ?? 'Customer name unavailable',
    customerEmail: item.customerSnapshot.billingEmail ?? '', customerAddress: addressText(item.customerSnapshot.billingAddress),
    subtotal: item.subtotal, discountTotal: item.discountTotal, taxTotal: item.taxTotal,
    lines: item.lines.map(line => ({ id: line.id, description: line.description, quantity: line.quantity, unitPrice: line.unitPrice, discountAmount: line.discountAmount, lineTotal: line.lineTotal, taxes: line.taxes.map(t => ({ name: t.name, rate: t.rate, amount: t.amount })) })),
    payments: item.payments.map(paymentView), history: item.logs.map(log => ({ status: log.status, at: log.createdAt, note: log.note })),
  };
}
function toSearch(query: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') params.set(key, String(value));
  return params.toString();
}
function toViewSubscription(item: SubscriptionApi): SubscriptionView {
  return { id: item.id, number: item.number, planName: item.plan.name, status: item.status, startDate: item.startDate, expiryDate: item.expiryDate, amount: item.plan.price, currency: 'INR', allowPause: item.plan.allowPause, allowRenewal: item.plan.allowRenewal, allowEarlyClosure: item.plan.allowEarlyClosure, allowEndDateClosure: item.plan.allowEndDateClosure, version: item.version, lines: item.lines.map(line => ({ id: line.id, productId: line.productId, variantId: line.variantId, description: line.description, quantity: line.quantity, agreedPrice: line.agreedPrice, isAddon: line.isAddon })), history: item.logs.map(log => ({ status: log.status, note: log.note, at: log.effectiveAt ?? log.createdAt })) };
}

export async function getFinanceDashboard(range?: DateRange): Promise<FinanceDashboardView> {
  const data = await apiRequest<DashboardApi>(`/reports/dashboard${range?.from || range?.to ? `?${toSearch({ from: range.from, to: range.to })}` : ''}`);
  return { activeSubscriptions: data.activeSubscriptions, invoiced: data.invoicedAmount, collected: data.collectedAmount, outstanding: data.outstandingBalance, overdueCount: data.overdueInvoiceCount, overdueBalance: data.overdueBalance, currency: 'INR', range: data.range };
}
export async function getInvoices(query: InvoiceQuery & { pageSize?: number }): Promise<{ rows: InvoiceSummary[]; pagination: PageInfo }> {
  const qs = toSearch({ page: query.page, pageSize: query.pageSize ?? 20, search: query.search, status: query.status, dueFrom: query.dueFrom, dueTo: query.dueTo });
  const result = await apiListRequest<InvoiceApi>(`/invoices?${qs}`);
  return { rows: result.data.map(invoiceSummary), pagination: result.pagination };
}
export async function getPayments(query: { page: number; search: string; status: string; method: string; paidFrom: string; paidTo: string }): Promise<{ rows: PaymentView[]; pagination: PageInfo }> {
  const qs = toSearch({ page: query.page, pageSize: 20, search: query.search, status: query.status, method: query.method, paidFrom: query.paidFrom, paidTo: query.paidTo, sortBy: 'paidAt', sortOrder: 'desc' });
  const result = await apiListRequest<PaymentApi>(`/payments?${qs}`);
  return { rows: result.data.map(paymentView), pagination: result.pagination };
}
export async function getInvoice(id: string): Promise<InvoiceDetailView> { return invoiceDetail(await apiRequest<InvoiceDetailApi>(`/invoices/${encodeURIComponent(id)}`)); }
function csrf() {
  const token = document.cookie.split(';').map(part => part.trim()).find(part => part.startsWith('bl_csrf='))?.slice('bl_csrf='.length);
  if (!token) throw new Error('Your session security token is missing. Refresh or sign in again.');
  return { csrf: { token: decodeURIComponent(token), headerName: 'x-csrf-token' } };
}
export async function invoiceAction(id: string, action: 'confirm' | 'cancel' | 'send') {
  await apiRequest(`/invoices/${encodeURIComponent(id)}/${action}`, { method: 'POST', ...csrf() });
}
export async function recordPayment(id: string, input: { method: string; amount: string; date: string; note: string }) {
  const methods: Record<string, string> = { 'Bank transfer': 'BANK_TRANSFER', Cash: 'CASH', UPI: 'UPI', Cheque: 'CHEQUE', Card: 'CARD', Other: 'OTHER' };
  return apiRequest<PaymentApi>(`/invoices/${encodeURIComponent(id)}/payments`, { method: 'POST', body: { method: methods[input.method] ?? input.method, amount: input.amount, paidAt: `${input.date}T12:00:00+05:30`, note: input.note || null }, ...csrf() });
}
export function openInvoicePrint(id: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
  const link = document.createElement('a');
  link.href = `${base}/invoices/${encodeURIComponent(id)}/print?print=1`;
  link.target = '_blank'; link.rel = 'noopener noreferrer'; link.click();
}
export async function getKanban(pages: Record<string, number> = {}): Promise<KanbanBucketView[]> {
  const summary = await apiRequest<KanbanSummaryApi>('/reports/due-kanban');
  return Promise.all(summary.buckets.map(async bucket => {
    const page = pages[bucket.bucket] ?? 1;
    const result = await apiListRequest<InvoiceApi>(`/reports/due-kanban/${encodeURIComponent(bucket.bucket)}?page=${page}&pageSize=20`);
    return { key: bucket.bucket, label: bucket.label, count: bucket.count, invoices: result.data.map(invoiceSummary), pagination: result.pagination };
  }));
}
export async function getQuarterlyReports(page = 1) {
  const result = await apiListRequest<QuarterlyApi>(`/reports/quarterly?page=${page}&pageSize=20`);
  return { reports: result.data.map(report => {
    const metadata = report.metadata && typeof report.metadata === 'object' ? report.metadata as Record<string, unknown> : {};
    return { id: report.id, period: report.periodKey, status: report.status, createdAt: report.createdAt ?? '', completedAt: report.completedAt, downloadAvailable: false, deliveryNote: typeof metadata.deliveryNote === 'string' ? metadata.deliveryNote : 'The API does not expose direct report downloads.' };
  }), pagination: result.pagination };
}
export async function runQuarterlyReport(periodKey?: string) {
  return apiRequest<{ skipped: boolean; report: QuarterlyApi; csvAvailable: boolean }>('/reports/quarterly/run', { method: 'POST', body: periodKey ? { periodKey } : {}, ...csrf() });
}
export async function getCustomerPortalData(invoicePage: number, paymentPage: number) {
  const [customer, dashboard, invoices, payments] = await Promise.all([
    apiListRequest<CustomerApi>('/customers?page=1&pageSize=1'),
    apiRequest<DashboardApi>('/reports/dashboard'),
    apiListRequest<InvoiceApi>(`/invoices?page=${invoicePage}&pageSize=20&sortBy=createdAt&sortOrder=desc`),
    apiListRequest<PaymentApi>(`/payments?page=${paymentPage}&pageSize=20&sortBy=paidAt&sortOrder=desc`),
  ]);
  const ownCustomer = customer.data[0];
  if (!ownCustomer) throw new Error('Your customer profile is not available. Ask support to check account setup.');
  const profileName = [ownCustomer.user?.firstName, ownCustomer.user?.lastName].filter(Boolean).join(' ');
  return {
    customer: { displayName: profileName || ownCustomer.legalName, billingEmail: ownCustomer.billingEmail },
    dashboard, invoices, payments,
  };
}
export async function getCustomerSubscriptions(page = 1): Promise<{ rows: SubscriptionView[]; pagination: PageInfo }> {
  const result = await apiListRequest<SubscriptionApi>(`/subscriptions?page=${page}&pageSize=20&sortBy=createdAt&sortOrder=desc`);
  return { rows: result.data.map(toViewSubscription), pagination: result.pagination };
}
export async function getSubscription(id: string): Promise<SubscriptionView> { return toViewSubscription(await apiRequest<SubscriptionApi>(`/subscriptions/${encodeURIComponent(id)}`)); }
export async function subscriptionAction(id: string, action: 'ACTIVATE' | 'PAUSE' | 'RESUME' | 'RENEW' | 'CLOSE') {
  return apiRequest(`/subscriptions/${encodeURIComponent(id)}/actions`, { method: 'POST', body: { action }, ...csrf() });
}
export async function toggleSubscriptionAddon(id: string, input: { productId: string; variantId?: string | null; quantity: number; enabled: boolean }) {
  return apiRequest(`/subscriptions/${encodeURIComponent(id)}/add-ons`, { method: 'POST', body: input, ...csrf() });
}
export async function createRazorpayOrder(invoiceId: string) { return apiRequest<OrderApi>(`/invoices/${encodeURIComponent(invoiceId)}/razorpay/order`, { method: 'POST', ...csrf() }); }
export async function verifyRazorpayPayment(paymentId: string, orderId: string) { return apiRequest<{ applied: boolean; duplicate: boolean; paymentId: string; invoiceId: string; status?: string; balance?: string }>('/payments/razorpay/verify', { method: 'POST', body: { paymentId, orderId }, ...csrf() }); }
export async function getCustomerInvoice(id: string) { return getInvoice(id); }
