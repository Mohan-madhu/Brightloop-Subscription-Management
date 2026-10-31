export type Company = { publicName: string; legalName: string; supportEmail: string | null; address: string | null; currency: string; timezone: string };
export type BillingInterval = { code: string; name: string; unit: string; count: number };
export type PublicPlan = { id: string; name: string; price: string; billingInterval: BillingInterval; productName: string | null };
export type ApiPagination = { page: number; pageSize: number; total: number; totalPages: number };
export type ApiSuccessResponse<T> = { data: T };
export type ApiListResponse<T> = { data: T[]; pagination: ApiPagination };
export type ApiErrorResponse = { error: { code: string; message: string; details?: unknown } };

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export class ApiClientError extends Error {
	status: number;
	code?: string;
	details?: unknown;

	constructor(message: string, status: number, code?: string, details?: unknown) {
		super(message);
		this.name = 'ApiClientError';
		this.status = status;
		this.code = code;
		this.details = details;
	}
}

export type ApiRequestOptions = Omit<RequestInit, 'body' | 'credentials'> & {
	body?: unknown;
	csrf?: { token: string; headerName: string };
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function readCsrfCookie(): string | null {
	if (typeof document === 'undefined') return null;
	const cookie = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('bl_csrf='));
	if (!cookie) return null;
	try {
		return decodeURIComponent(cookie.slice('bl_csrf='.length));
	} catch {
		return null;
	}
}

async function requestEnvelope<T>(path: string, options: ApiRequestOptions = {}): Promise<ApiSuccessResponse<T> & { pagination?: ApiPagination }> {
	const { body: requestBody, csrf, ...requestOptions } = options;
	const headers = new Headers(requestOptions.headers);
	let body: BodyInit | undefined;

	if (requestBody !== undefined) {
		body = typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody);
		if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
	}
	const method = (requestOptions.method ?? 'GET').toUpperCase();
	if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
		const csrfToken = csrf?.token ?? readCsrfCookie();
		if (csrfToken) headers.set(csrf?.headerName ?? 'X-CSRF-Token', csrfToken);
	}

	let response: Response;
	try {
		response = await fetch(`${apiBase}${path}`, {
			...requestOptions,
			body,
			cache: 'no-store',
			credentials: 'include',
			headers,
		});
	} catch {
		throw new ApiClientError('The service could not be reached.', 0, 'NETWORK_ERROR');
	}

	const payload: unknown = await response.json().catch(() => null);
	if (!response.ok) {
		if (response.status === 401 && typeof window !== 'undefined') window.dispatchEvent(new Event('brightloop:unauthenticated'));
		const error = isRecord(payload) && isRecord(payload.error) ? payload.error : undefined;
		throw new ApiClientError(
			typeof error?.message === 'string' ? error.message : 'The request could not be completed.',
			response.status,
			typeof error?.code === 'string' ? error.code : undefined,
			error?.details,
		);
	}

	if (!isRecord(payload) || !('data' in payload)) {
		throw new ApiClientError('The server returned an invalid response.', response.status, 'INVALID_RESPONSE');
	}

	return payload as ApiSuccessResponse<T> & { pagination?: ApiPagination };
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
	const response = await requestEnvelope<T>(path, options);
	return response.data;
}

export async function apiListRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<ApiListResponse<T>> {
	const response = await requestEnvelope<T[]>(path, options);
	if (!response.pagination) throw new ApiClientError('The server returned an invalid list response.', 200, 'INVALID_RESPONSE');
	return { data: response.data, pagination: response.pagination };
}

export const getCompany = () => apiRequest<Company>('/public/company');
export const getIntervals = async () => (await apiListRequest<BillingInterval>('/public/billing-intervals?page=1&pageSize=20')).data;
export const getPublicPlans = async () => (await apiListRequest<PublicPlan>('/public/plans?page=1&pageSize=20&sortBy=createdAt&sortOrder=asc')).data;
