import { apiClient } from '../../shared/api/client';
import { User, LoginDto, RegisterDto, AuthResponse } from '@syncboard/shared-types';

export async function loginApi(dto: LoginDto): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/login', dto);
  return res.data!;
}

export async function registerApi(dto: RegisterDto): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/register', dto);
  return res.data!;
}

export async function logoutApi(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function getMeApi(): Promise<User> {
  const res = await apiClient.get<User>('/auth/me');
  return res.data!;
}

export async function refreshApi(): Promise<{ accessToken: string }> {
  const res = await apiClient.post<{ accessToken: string }>('/auth/refresh');
  return res.data!;
}
