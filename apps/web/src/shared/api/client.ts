import { ApiResponse, ApiErrorCodes } from '@syncboard/shared-types';

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown> | Array<unknown>,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class VersionConflictError<T = unknown> extends ApiClientError {
  constructor(
    message: string,
    public readonly currentEntity: T,
  ) {
    super(ApiErrorCodes.VERSION_CONFLICT, message, undefined, 409);
    this.name = 'VersionConflictError';
  }
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = '/api/v1') {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    const data: ApiResponse<T> = await response.json().catch(() => ({
      success: false,
      data: null,
      error: { code: 'UNKNOWN_ERROR', message: 'Non-JSON server response' },
      meta: null,
    }));

    if (!response.ok || !data.success) {
      if (response.status === 409 || data.error?.code === ApiErrorCodes.VERSION_CONFLICT) {
        throw new VersionConflictError(
          data.error?.message || 'Version conflict detected',
          data.data,
        );
      }

      throw new ApiClientError(
        data.error?.code || 'UNKNOWN_ERROR',
        data.error?.message || response.statusText,
        data.error?.details,
        response.status,
      );
    }

    return data;
  }

  get<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

const defaultBaseUrl = (import.meta as any).env?.VITE_API_URL
  ? `${(import.meta as any).env.VITE_API_URL.replace(/\/$/, '')}/api/v1`
  : '/api/v1';

export const apiClient = new ApiClient(defaultBaseUrl);
