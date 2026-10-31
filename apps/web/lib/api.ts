export type Company = { publicName: string; legalName: string; supportEmail: string | null; address: string | null; currency: string; timezone: string };
export type BillingInterval = { code: string; name: string; unit: string; count: number };
type ApiError = { error: { message: string } };
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
async function request<T>(path: string): Promise<T> { const response = await fetch(`${apiBase}${path}`, { cache: 'no-store' }); const body = await response.json() as { data?: T } & ApiError; if (!response.ok || !body.data) throw new Error(body.error?.message ?? 'The service could not be reached.'); return body.data; }
export const getCompany = () => request<Company>('/public/company');
export const getIntervals = () => request<BillingInterval[]>('/public/billing-intervals?page=1&pageSize=20');
