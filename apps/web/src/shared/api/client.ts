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

  constructor(baseUrl?: string) {
    let envUrl = ((import.meta as any).env?.VITE_API_URL as string) || '';
    envUrl = envUrl.trim().replace(/\/+$/, '');
    if (envUrl && !envUrl.endsWith('/api/v1')) {
      envUrl = `${envUrl}/api/v1`;
    }
    this.baseUrl = baseUrl || envUrl || '/api/v1';
  }

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json');
    }

    if (this.token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    } catch (networkErr: any) {
      throw new ApiClientError(
        'NETWORK_ERROR',
        'Backend server is waking up or unreachable. Please wait 15 seconds and try again.',
        undefined,
        0,
      );
    }

    let data: ApiResponse<T>;
    try {
      data = await response.json();
    } catch {
      throw new ApiClientError(
        'PARSE_ERROR',
        `Server returned non-JSON response (${response.status} ${response.statusText})`,
        undefined,
        response.status,
      );
    }

    if (!response.ok) {
      if (response.status === 409 && data.error?.code === ApiErrorCodes.VERSION_CONFLICT) {
        throw new VersionConflictError(
          data.error.message || 'Version conflict detected',
          (data.error as any).current,
        );
      }

      throw new ApiClientError(
        data.error?.code || 'REQUEST_FAILED',
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

export const apiClient = new ApiClient();
