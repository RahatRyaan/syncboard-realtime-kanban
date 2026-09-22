import { apiClient } from '../../shared/api/client';

export interface CommentItem {
  id: string;
  cardId: string;
  userId: string;
  user?: { id: string; name: string; email: string; avatarUrl?: string };
  content: string;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  recipientId: string;
  senderId: string;
  sender?: { id: string; name: string; email: string };
  type: string;
  boardId?: string;
  cardId?: string;
  commentId?: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export async function getCommentsByCard(cardId: string): Promise<CommentItem[]> {
  const res = await apiClient.get<CommentItem[]>(`/comments?cardId=${cardId}`);
  return res.data || [];
}

export async function createCommentApi(cardId: string, content: string): Promise<CommentItem> {
  const res = await apiClient.post<CommentItem>('/comments', { cardId, content });
  return res.data!;
}

export async function deleteCommentApi(commentId: string): Promise<void> {
  await apiClient.delete(`/comments/${commentId}`);
}

export async function getNotificationsApi(unreadOnly = false): Promise<NotificationItem[]> {
  const res = await apiClient.get<NotificationItem[]>(
    `/notifications?unreadOnly=${unreadOnly}`,
  );
  return res.data || [];
}

export async function markNotificationAsReadApi(notificationId: string): Promise<void> {
  await apiClient.patch(`/notifications/${notificationId}/read`);
}

export async function markAllNotificationsAsReadApi(): Promise<void> {
  await apiClient.post('/notifications/read-all');
}

export async function getActivityLogsByBoard(
  boardId: string,
  cursor?: string,
): Promise<{ data: any[]; nextCursor: string | null }> {
  const query = cursor ? `?cursor=${cursor}` : '';
  const res = await apiClient.get<any>(`/activity-logs/board/${boardId}${query}`);
  return res.data || { data: [], nextCursor: null };
}
