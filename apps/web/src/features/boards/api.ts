import { apiClient } from '../../shared/api/client';
import { Board, CreateBoardDto } from '@syncboard/shared-types';

export async function getBoardsByWorkspace(workspaceId: string): Promise<Board[]> {
  const res = await apiClient.get<Board[]>(`/boards?workspaceId=${workspaceId}`);
  return res.data || [];
}

export async function getBoardById(id: string): Promise<Board> {
  const res = await apiClient.get<Board>(`/boards/${id}`);
  return res.data!;
}

export async function createBoardApi(dto: CreateBoardDto): Promise<Board> {
  const res = await apiClient.post<Board>('/boards', dto);
  return res.data!;
}

export async function updateBoardApi(
  id: string,
  body: { title?: string; description?: string; expectedVersion: number },
): Promise<Board> {
  const res = await apiClient.patch<Board>(`/boards/${id}`, body);
  return res.data!;
}

export async function deleteBoardApi(id: string): Promise<void> {
  await apiClient.delete(`/boards/${id}`);
}

export async function searchWorkspaceApi(
  workspaceId: string,
  query: string,
): Promise<{ query: string; totalResults: number; boards: any[]; cards: any[] }> {
  const res = await apiClient.get<any>(
    `/search?workspaceId=${workspaceId}&q=${encodeURIComponent(query)}`,
  );
  return res.data || { query, totalResults: 0, boards: [], cards: [] };
}
