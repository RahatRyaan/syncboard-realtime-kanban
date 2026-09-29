/**
 * User representation in SyncBoard.
 */
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  jobTitle?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Workspace membership role.
 */
export type MembershipRole = 'owner' | 'admin' | 'member' | 'viewer';

/**
 * Workspace representation.
 */
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan?: 'free' | 'pro' | 'enterprise';
  createdAt: string;
  updatedAt: string;
}

/**
 * Membership association linking a User to a Workspace with a role.
 */
export interface Membership {
  id: string;
  workspaceId: string;
  userId: string;
  role: MembershipRole;
  createdAt: string;
  updatedAt: string;
}

/**
 * JWT Access and Refresh token response payload.
 */
export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: User;
}

export type AuthResponse = AuthTokens;

/**
 * Decoded JWT access token claims.
 */
export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

/**
 * Register DTO.
 */
export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

/**
 * Login DTO.
 */
export interface LoginDto {
  email: string;
  password: string;
}

/**
 * Fields a signed-in user may change on their own profile.
 * Email and password are intentionally excluded — those need dedicated flows.
 */
export interface UpdateProfileDto {
  name?: string;
  bio?: string;
  jobTitle?: string;
  location?: string;
  avatarUrl?: string;
}

/**
 * Presigned upload descriptor for a direct-to-S3 avatar upload.
 */
export interface AvatarPresignDto {
  fileName: string;
  mimeType: string;
  size: number;
}
