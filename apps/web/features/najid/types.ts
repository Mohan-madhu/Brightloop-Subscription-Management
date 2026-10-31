/**
 * UI view models owned by Najid's feature area. These are not API response
 * contracts. Basim/Vijay/Mohan's agreed API client adapters must map real
 * responses into these models before the screens are mounted with data.
 */
export type PageInfo = { page: number; pageSize: number; total: number; totalPages: number };
export type InvoiceQuery = { page: number; search: string; status: string; dueFrom: string; dueTo: string };
export type PaymentQuery = { page: number; search: string; status: string; method: string; paidFrom: string; paidTo: string };
export type DateRange = { from: string; to: string };
export type LoadState = { loading: boolean; error: string | null; onRetry: () => void };

export type PaymentView = {
  id: string; amount: string; method: string; status: string; paidAt: string;
  note?: string | null; reference?: string | null; invoiceNumber?: string | null;
};
export type InvoiceSummary = {
  id: string; number: string; customerName: string; customerEmail?: string;
  issueDate: string; dueDate: string; currency: 'INR'; status: string; overdue?: boolean;
  total: string; balance: string;
};
export type InvoiceLineView = {
  id: string; description: string; quantity: number; unitPrice: string;
  discountAmount: string; lineTotal: string;
  taxes: Array<{ name: string; rate: string; amount: string }>;
};
export type InvoiceDetailView = InvoiceSummary & {
  customerAddress?: string | null; subtotal: string; discountTotal: string;
  taxTotal: string; payments: PaymentView[]; lines: InvoiceLineView[];
  history: Array<{ status: string; at: string; note?: string | null }>;
};
export type FinanceDashboardView = {
  activeSubscriptions: number; invoiced: string; collected: string;
  outstanding: string; overdueCount: number; overdueBalance: string;
  currency: 'INR'; range: DateRange;
};
export type KanbanBucketView = {
  key: string; label: string; count: number; invoices: InvoiceSummary[]; pagination: PageInfo;
};
export type QuarterlyReportView = {
  id: string; period: string; status: string; createdAt: string;
  completedAt?: string | null; downloadAvailable: boolean; deliveryNote?: string;
};
export type SubscriptionView = {
  id: string; number: string; planName: string; status: string;
  startDate: string; expiryDate?: string | null; nextBillingDate?: string | null;
  amount: string; currency: 'INR'; allowPause: boolean; allowRenewal: boolean;
  allowEarlyClosure: boolean; allowEndDateClosure: boolean; version: number;
  lines: Array<{ id: string; productId?: string; variantId?: string | null; description: string; quantity: number; agreedPrice: string; isAddon: boolean }>;
  history?: Array<{ status: string; note?: string | null; at: string }>;
};
export type CustomerPortalView = {
  displayName: string; billingEmail: string; currency: 'INR';
  outstanding: string; subscriptions: SubscriptionView[] | null;
  invoices: InvoiceSummary[]; payments: PaymentView[];
};
