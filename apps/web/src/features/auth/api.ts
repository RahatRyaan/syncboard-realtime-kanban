import { apiClient } from '../../shared/api/client';
import {
  User,
  LoginDto,
  RegisterDto,
  UpdateProfileDto,
  AuthResponse,
} from '@syncboard/shared-types';

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

export async function updateProfileApi(dto: UpdateProfileDto): Promise<User> {
  const res = await apiClient.patch<User>('/auth/profile', dto);
  return res.data!;
}

export interface AvatarPresignResult {
  presignedUrl: string;
  key: string;
  url: string;
  expiresIn: number;
}

export async function presignAvatarApi(
  fileName: string,
  mimeType: string,
  size: number,
): Promise<AvatarPresignResult> {
  const res = await apiClient.post<AvatarPresignResult>('/auth/profile/avatar/presign', {
    fileName,
    mimeType,
    size,
  });
  return res.data!;
}

/**
 * Uploads the file directly to object storage using the presigned URL, then
 * returns the public URL to persist on the profile.
 */
export async function uploadAvatar(file: File): Promise<string> {
  const presign = await presignAvatarApi(file.name, file.type, file.size);

  const response = await fetch(presign.presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Upload failed (${response.status})`);
  }

  return presign.url;
}

export interface DemoAccountInfo {
  enabled: boolean;
  email?: string;
  password?: string;
  workspaceName?: string;
}

/**
 * Asks the server whether a public demo account is available. The credential is
 * only ever returned when the server was started with SEED_DEMO_DATA=true.
 */
export async function getDemoAccountApi(): Promise<DemoAccountInfo> {
  try {
    const res = await apiClient.get<DemoAccountInfo>('/demo/account');
    return res.data || { enabled: false };
  } catch {
    return { enabled: false };
  }
}
