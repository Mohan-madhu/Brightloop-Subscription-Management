const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  code: string;
  statusCode: number;
  details?: any;

  constructor(message: string, code = 'API_ERROR', statusCode = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  try {
    const res = await fetch(url, { ...options, headers });
    const json = await res.json();

    if (!res.ok || json.success === false) {
      throw new ApiError(
        json.error?.message || json.message || 'Request failed',
        json.error?.code || 'UNKNOWN_ERROR',
        res.status,
        json.error?.details
      );
    }

    if (json.data !== undefined) {
      if (Array.isArray(json.data)) {
        (json.data as any).data = json.data;
        if (json.pagination) {
          (json.data as any).pagination = json.pagination;
        }
      }
      return json.data;
    }
    return json;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || 'Network communication error', 'NETWORK_ERROR', 0);
  }
}

export const api = {
  // Auth
  auth: {
    login: (credentials: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    register: (data: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    activate: (token: string, email: string) => request(`/auth/activate?token=${token}&email=${encodeURIComponent(email)}`),
    forgotPassword: (email: string) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: (data: any) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
    getMe: () => request('/auth/me')
  },

  // Users & Staff
  users: {
    list: (params: Record<string, any> = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/users${q ? `?${q}` : ''}`);
    },
    createStaff: (data: any) => request('/users/staff', { method: 'POST', body: JSON.stringify(data) }),
    assignMarketing: (data: any) => request('/users/assign-marketing', { method: 'POST', body: JSON.stringify(data) })
  },

  // Catalog
  products: {
    list: () => request('/products'),
    create: (data: any) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
    createVariant: (data: any) => request('/variants', { method: 'POST', body: JSON.stringify(data) })
  },
  plans: {
    list: () => request('/plans'),
    create: (data: any) => request('/plans', { method: 'POST', body: JSON.stringify(data) })
  },
  addOns: {
    list: () => request('/add-ons'),
    create: (data: any) => request('/add-ons', { method: 'POST', body: JSON.stringify(data) })
  },
  taxes: {
    list: () => request('/taxes'),
    create: (data: any) => request('/taxes', { method: 'POST', body: JSON.stringify(data) })
  },
  discounts: {
    list: () => request('/discounts'),
    create: (data: any) => request('/discounts', { method: 'POST', body: JSON.stringify(data) })
  },

  // Quotations
  quotations: {
    list: () => request('/quotations'),
    create: (data: any) => request('/quotations', { method: 'POST', body: JSON.stringify(data) }),
    accept: (id: string) => request(`/quotations/${id}/accept`, { method: 'POST' }),
    listTemplates: () => request('/quotations/templates'),
    createTemplate: (data: any) => request('/quotations/templates', { method: 'POST', body: JSON.stringify(data) })
  },

  // Subscriptions
  subscriptions: {
    list: () => request('/subscriptions'),
    create: (data: any) => request('/subscriptions', { method: 'POST', body: JSON.stringify(data) }),
    get: (id: string) => request(`/subscriptions/${id}`),
    pause: (id: string) => request(`/subscriptions/${id}/pause`, { method: 'POST' }),
    resume: (id: string) => request(`/subscriptions/${id}/resume`, { method: 'POST' }),
    close: (id: string) => request(`/subscriptions/${id}/close`, { method: 'POST' })
  },

  // Invoices & Billing
  invoices: {
    list: (params: Record<string, any> = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/invoices${q ? `?${q}` : ''}`);
    },
    get: (id: string) => request(`/invoices/${id}`),
    confirm: (id: string) => request(`/invoices/${id}/confirm`, { method: 'POST' }),
    cancel: (id: string) => request(`/invoices/${id}/cancel`, { method: 'POST' }),
    triggerBilling: (data: any = {}) => request('/invoices/process-due', { method: 'POST', body: JSON.stringify(data) })
  },

  // Payments
  payments: {
    manual: (data: any) => request('/payments/manual', { method: 'POST', body: JSON.stringify(data) }),
    initRazorpay: (invoiceId: string) => request('/payments/razorpay/create-order', { method: 'POST', body: JSON.stringify({ invoiceId }) }),
    verifyRazorpay: (data: any) => request('/payments/razorpay/verify', { method: 'POST', body: JSON.stringify(data) })
  },

  // Reports
  reports: {
    getDashboard: () => request('/reports/dashboard'),
    getKanban: () => request('/reports/due-date-kanban'),
    listQuarterly: () => request('/reports/quarterly'),
    createQuarterly: (data: any) => request('/reports/quarterly', { method: 'POST', body: JSON.stringify(data) })
  },

  // Multi-Channel Reminders & IVR Triggers
  reminders: {
    trigger: (data: any) => request('/reminders/trigger', { method: 'POST', body: JSON.stringify(data) }),
    batch: (data: any) => request('/reminders/batch', { method: 'POST', body: JSON.stringify(data) }),
    getLogs: (params: Record<string, any> = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/reminders/logs${q ? `?${q}` : ''}`);
    }
  }
};
