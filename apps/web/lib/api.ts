export type Company = { publicName: string; legalName: string; supportEmail: string | null; address: string | null; currency: string; timezone: string };
export type BillingInterval = { code: string; name: string; unit: string; count: number };
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

async function requestEnvelope<T>(path: string, options: ApiRequestOptions = {}): Promise<ApiSuccessResponse<T> & { pagination?: ApiPagination }> {
	const headers = new Headers(options.headers);
	let body: BodyInit | undefined;

	if (options.body !== undefined) {
		body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
		if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
	}
	if (options.csrf) headers.set(options.csrf.headerName, options.csrf.token);

	let response: Response;
	try {
		response = await fetch(`${apiBase}${path}`, {
			...options,
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
