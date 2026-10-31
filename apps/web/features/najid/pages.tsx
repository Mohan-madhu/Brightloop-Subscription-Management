'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from '../../lib/session';
import {
  getCustomerPortalData, getCustomerInvoice, getFinanceDashboard, getInvoice,
  getInvoices, getKanban, getPayments, getQuarterlyReports, getSubscription,
  invoiceAction, openInvoicePrint, recordPayment, runQuarterlyReport,
  subscriptionAction,
} from './api';
import { startRazorpayCheckout } from './razorpay';
import {
  CustomerInvoiceScreen, CustomerPortalScreen, FinanceDashboardScreen,
  DueDateKanbanScreen, FinancePaymentsScreen, InvoiceDetailScreen, InvoiceListScreen,
  QuarterlyReportsScreen, SubscriptionDetailScreen,
} from './screens';
import type { DateRange, FinanceDashboardView, InvoiceDetailView, InvoiceQuery, InvoiceSummary, PageInfo, PaymentQuery, PaymentView, QuarterlyReportView, SubscriptionView } from './types';

function useRemote<T>(request: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [generation, setGeneration] = useState(0);
  useEffect(() => {
    let live = true; setLoading(true); setError(null);
    void request().then(value => { if (live) setData(value); }).catch(cause => { if (live) setError(cause instanceof Error ? cause.message : 'The request failed.'); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [request, generation]);
  const retry = useCallback(() => setGeneration(value => value + 1), []);
  return { data, loading, error, retry };
}

export function FinanceDashboardPage() {
  const [range, setRange] = useState<DateRange>({ from: '', to: '' });
  const request = useCallback(() => getFinanceDashboard(range), [range]);
  const state = useRemote<FinanceDashboardView>(request);
  return <FinanceDashboardScreen {...state} onRetry={state.retry} onRangeChange={setRange} />;
}

export function FinanceInvoicesPage() {
  const router = useRouter(); const [query, setQuery] = useState<InvoiceQuery>({ page: 1, search: '', status: '', dueFrom: '', dueTo: '' });
  const request = useCallback(() => getInvoices(query), [query]); const state = useRemote<{ rows: InvoiceSummary[]; pagination: PageInfo }>(request);
  const emptyPage: PageInfo = { page: query.page, pageSize: 20, total: 0, totalPages: 0 };
  return <InvoiceListScreen {...state} onRetry={state.retry} rows={state.data?.rows ?? []} pagination={state.data?.pagination ?? emptyPage} onQuery={setQuery} onOpen={id => router.push(`/finance/invoices/${encodeURIComponent(id)}`)} />;
}

export function FinancePaymentsPage() {
  const [query, setQuery] = useState<PaymentQuery>({ page: 1, search: '', status: '', method: '', paidFrom: '', paidTo: '' });
  const request = useCallback(() => getPayments(query), [query]); const state = useRemote<{ rows: PaymentView[]; pagination: PageInfo }>(request);
  const emptyPage: PageInfo = { page: query.page, pageSize: 20, total: 0, totalPages: 0 };
  return <FinancePaymentsScreen {...state} onRetry={state.retry} rows={state.data?.rows ?? []} pagination={state.data?.pagination ?? emptyPage} onQuery={setQuery} />;
}

export function FinanceInvoiceDetailPage() {
  const params = useParams<{ invoiceId: string }>(); const id = params.invoiceId; const session = useSession();
  const request = useCallback(() => getInvoice(id), [id]); const state = useRemote<InvoiceDetailView>(request); const invoice = state.data;
  const financeRole = session.user?.roles.some(role => role === 'ADMIN' || role === 'FINANCE') ?? false;
  const paymentConfirmed = invoice?.payments.some(payment => payment.status === 'CONFIRMED') ?? false;
  const permissions = {
    confirm: financeRole && invoice?.status === 'DRAFT',
    send: financeRole && invoice !== null && !['DRAFT','CANCELLED'].includes(invoice.status),
    cancel: financeRole && invoice !== null && ['DRAFT','CONFIRMED','SENT'].includes(invoice.status) && !paymentConfirmed,
  };
  return <InvoiceDetailScreen {...state} onRetry={state.retry} invoice={invoice} permissions={permissions}
    onAction={async action => { await invoiceAction(id, action); state.retry(); }}
    onDownload={async () => openInvoicePrint(id)}
    onRecordPayment={async input => { await recordPayment(id, input); state.retry(); }} />;
}

export function FinanceKanbanPage() {
  const router = useRouter(); const [pages, setPages] = useState<Record<string, number>>({}); const request = useCallback(() => getKanban(pages), [pages]); const state = useRemote<Awaited<ReturnType<typeof getKanban>>>(request);
  return <DueDateKanbanScreen {...state} onRetry={state.retry} buckets={state.data ?? []} onPage={(bucket, page) => setPages(current => ({ ...current, [bucket]: page }))} onOpen={id => router.push(`/finance/invoices/${encodeURIComponent(id)}`)} />;
}

export function FinanceQuarterlyReportsPage() {
  const request = useCallback(() => getQuarterlyReports(), []); const state = useRemote<{ reports: QuarterlyReportView[]; pagination: PageInfo }>(request);
  return <QuarterlyReportsScreen {...state} onRetry={state.retry} reports={state.data?.reports ?? []} onRun={async () => { await runQuarterlyReport(); state.retry(); }} />;
}

export function CustomerPortalPage() {
  const [invoicePage, setInvoicePage] = useState(1); const [paymentPage, setPaymentPage] = useState(1);
  const request = useCallback(() => getCustomerPortalData(invoicePage, paymentPage), [invoicePage, paymentPage]);
  const state = useRemote<Awaited<ReturnType<typeof getCustomerPortalData>>>(request);
  const customer = state.data ? { displayName: state.data.customer.displayName, billingEmail: state.data.customer.billingEmail, currency: 'INR' as const, outstanding: state.data.dashboard.outstandingBalance, subscriptions: null, invoices: state.data.invoices.data.map(row => ({ id: row.id, number: row.number, customerName: row.customerName ?? '', issueDate: row.createdAt, dueDate: row.dueDate, currency: 'INR' as const, status: row.overdue ? 'OVERDUE' : row.status, overdue: row.overdue, total: row.total, balance: row.balance })), payments: state.data.payments.data.map(payment => ({ id: payment.id, amount: payment.amount, method: payment.method, status: payment.status, paidAt: payment.paidAt, note: payment.note, reference: payment.providerPaymentId, invoiceNumber: payment.invoiceNumber })) } : null;
  const empty: PageInfo = { page: 1, pageSize: 20, total: 0, totalPages: 0 };
  return <CustomerPortalScreen {...state} onRetry={state.retry} customer={customer} pagination={state.data?.invoices.pagination ?? empty} onPage={setInvoicePage} paymentPagination={state.data?.payments.pagination ?? empty} onPaymentPage={setPaymentPage} onOpenInvoice={id => { window.location.href = `/portal/invoices/${encodeURIComponent(id)}`; }} onOpenSubscription={id => { window.location.href = `/portal/subscriptions/${encodeURIComponent(id)}`; }} />;
}

export function CustomerInvoiceDetailPage() {
  const params = useParams<{ invoiceId: string }>(); const id = params.invoiceId;
  const request = useCallback(() => getCustomerInvoice(id), [id]); const state = useRemote<InvoiceDetailView>(request);
  return <CustomerInvoiceScreen {...state} onRetry={state.retry} invoice={state.data} onCheckout={update => startRazorpayCheckout(id, update).then(() => state.retry())} />;
}

export function CustomerSubscriptionDetailPage() {
  const params = useParams<{ subscriptionId: string }>(); const id = params.subscriptionId;
  const request = useCallback(() => getSubscription(id), [id]); const state = useRemote<SubscriptionView>(request);
  return <SubscriptionDetailScreen {...state} onRetry={state.retry} subscription={state.data} onAction={async action => { const upper = action.toUpperCase() as 'PAUSE' | 'RESUME' | 'CLOSE'; await subscriptionAction(id, upper); state.retry(); }} />;
}

export function CustomerSubscriptionsUnavailable() {
  return <section className="mx-auto max-w-3xl p-4 sm:p-8"><h1 className="text-2xl font-bold">Your subscriptions</h1><p className="mt-2 text-sm text-amber-900">The backend has a scoped subscription detail endpoint, but no own-subscription list or pagination endpoint. No customer ID selector or fabricated list is used.</p></section>;
}
