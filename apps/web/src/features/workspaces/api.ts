import { apiClient } from '../../shared/api/client';

export interface WorkspaceMember {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: 'free' | 'pro' | 'enterprise';
  members: WorkspaceMember[];
  createdAt: string;
  updatedAt: string;
}

export async function getWorkspacesApi(): Promise<Workspace[]> {
  const res = await apiClient.get<Workspace[]>('/workspaces');
  return res.data || [];
}

export async function getWorkspaceById(id: string): Promise<Workspace> {
  const res = await apiClient.get<Workspace>(`/workspaces/${id}`);
  return res.data!;
}

export async function createWorkspaceApi(name: string): Promise<Workspace> {
  const res = await apiClient.post<Workspace>('/workspaces', { name });
  return res.data!;
}

export async function inviteWorkspaceMemberApi(
  workspaceId: string,
  email: string,
  role: string = 'member',
): Promise<{ token: string; inviteUrl: string }> {
  const res = await apiClient.post<any>(`/workspaces/${workspaceId}/invites`, {
    email,
    role,
  });
  return res.data!;
}

export async function acceptInviteApi(token: string): Promise<{ workspaceId: string }> {
  const res = await apiClient.post<any>(`/workspaces/invites/${token}/accept`);
  return res.data!;
}

export async function updateWorkspacePlanApi(
  workspaceId: string,
  plan: 'free' | 'pro' | 'enterprise',
): Promise<Workspace> {
  const res = await apiClient.patch<Workspace>(`/workspaces/${workspaceId}/plan`, { plan });
  return res.data!;
}
