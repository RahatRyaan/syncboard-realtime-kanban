import { apiClient } from '../../shared/api/client';
import { Column, CreateColumnDto } from '@syncboard/shared-types';

export async function getColumnsByBoard(boardId: string): Promise<Column[]> {
  const res = await apiClient.get<Column[]>(`/columns?boardId=${boardId}`);
  return res.data || [];
}

export async function createColumnApi(dto: CreateColumnDto): Promise<Column> {
  const res = await apiClient.post<Column>('/columns', dto);
  return res.data!;
}

export async function updateColumnApi(
  id: string,
  body: { title?: string; status?: string; rank?: string; expectedVersion: number },
): Promise<Column> {
  const res = await apiClient.patch<Column>(`/columns/${id}`, body);
  return res.data!;
}

export async function deleteColumnApi(id: string): Promise<void> {
  await apiClient.delete(`/columns/${id}`);
}
