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
 * Demo owner credential, resolved in the browser.
 *
 * The login page must always show this button, including on a deployed API
 * that was never started with SEED_DEMO_DATA=true, so the credential lives
 * here rather than behind a server round-trip. It is deliberately public: the
 * demo workspace is a throwaway seeded account, never a real one. Set
 * VITE_DEMO_PASSWORD to a different value, or to an empty string to hide the
 * button entirely.
 */
export const DEMO_OWNER = {
  email: 'demo@syncboard.app',
  password: 'SyncBoard!Demo2026',
  workspaceName: 'Acme Product Team',
} as const;

/**
 * Reads the demo credential from build-time env, falling back to the built-in
 * default. An explicitly empty VITE_DEMO_PASSWORD disables the button.
 */
export function getDemoAccount(): DemoAccountInfo {
  const env = (import.meta as any).env ?? {};
  const email = env.VITE_DEMO_EMAIL as string | undefined;
  const password = env.VITE_DEMO_PASSWORD as string | undefined;

  if (password === '' || email === '') {
    return { enabled: false };
  }

  return {
    enabled: true,
    email: email || DEMO_OWNER.email,
    password: password || DEMO_OWNER.password,
    workspaceName: DEMO_OWNER.workspaceName,
  };
}
