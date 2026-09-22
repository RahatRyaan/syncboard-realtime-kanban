import { apiClient } from '../../shared/api/client';
import {
  Card,
  CreateCardDto,
  UpdateCardDto,
  MoveCardDto,
} from '@syncboard/shared-types';

export async function getCardsByBoard(boardId: string, columnId?: string): Promise<Card[]> {
  const query = columnId ? `boardId=${boardId}&columnId=${columnId}` : `boardId=${boardId}`;
  const res = await apiClient.get<Card[]>(`/cards?${query}`);
  return res.data || [];
}

export async function getCardById(id: string): Promise<Card> {
  const res = await apiClient.get<Card>(`/cards/${id}`);
  return res.data!;
}

export async function createCardApi(dto: CreateCardDto): Promise<Card> {
  const res = await apiClient.post<Card>('/cards', dto);
  return res.data!;
}

export async function updateCardApi(id: string, dto: UpdateCardDto): Promise<Card> {
  const res = await apiClient.patch<Card>(`/cards/${id}`, dto);
  return res.data!;
}

export async function moveCardApi(id: string, dto: MoveCardDto): Promise<Card> {
  const res = await apiClient.patch<Card>(`/cards/${id}/move`, dto);
  return res.data!;
}

export async function deleteCardApi(id: string): Promise<void> {
  await apiClient.delete(`/cards/${id}`);
}

export async function presignAttachmentApi(
  cardId: string,
  fileName: string,
  mimeType: string,
): Promise<{ presignedUrl: string; key: string; url: string; expiresIn: number }> {
  const res = await apiClient.post<any>(`/cards/${cardId}/attachments/presign`, {
    fileName,
    mimeType,
  });
  return res.data!;
}

export async function addAttachmentApi(
  cardId: string,
  attachment: { name: string; key: string; url: string; size: number; mimeType: string },
): Promise<Card> {
  const res = await apiClient.post<Card>(`/cards/${cardId}/attachments`, attachment);
  return res.data!;
}

export async function removeAttachmentApi(cardId: string, attachmentId: string): Promise<void> {
  await apiClient.delete(`/cards/${cardId}/attachments/${attachmentId}`);
}
