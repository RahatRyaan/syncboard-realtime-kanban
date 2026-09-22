import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Paperclip,
  MessageSquare,
  Upload,
  Trash2,
  Send,
  Sparkles,
  User,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Card } from '@syncboard/shared-types';
import {
  getCardById,
  updateCardApi,
  presignAttachmentApi,
  addAttachmentApi,
  removeAttachmentApi,
} from './api';
import {
  getCommentsByCard,
  createCommentApi,
  deleteCommentApi,
  CommentItem,
} from '../comments/api';
import { useAuth } from '../../app/providers';
import { socketManager } from '../../shared/realtime/socket';

interface CardDetailModalProps {
  cardId: string;
  onClose: () => void;
  onCardUpdated?: (card: Card) => void;
}

export function CardDetailModal({ cardId, onClose, onCardUpdated }: CardDetailModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Fetch card details
  const { data: card, isLoading: loadingCard } = useQuery({
    queryKey: ['card', cardId],
    queryFn: () => getCardById(cardId),
  });

  // Fetch comments
  const { data: comments = [] } = useQuery({
    queryKey: ['comments', cardId],
    queryFn: () => getCommentsByCard(cardId),
  });

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description || '');
    }
  }, [card]);

  // Join card room for real-time comment updates
  useEffect(() => {
    const socket = socketManager.getSocket();
    if (socket) {
      socket.emit('card:join', { cardId });

      const handleCommentCreated = (comment: CommentItem) => {
        queryClient.setQueryData(['comments', cardId], (old: CommentItem[] = []) => {
          if (old.some((c) => c.id === comment.id)) return old;
          return [...old, comment];
        });
      };

      socket.on('comment:created', handleCommentCreated);

      return () => {
        socket.emit('card:leave', { cardId });
        socket.off('comment:created', handleCommentCreated);
      };
    }
  }, [cardId, queryClient]);

  // Update card mutation
  const updateCardMutation = useMutation({
    mutationFn: (updates: { title?: string; description?: string }) =>
      updateCardApi(cardId, {
        ...updates,
        expectedVersion: card!.version,
      }),
    onSuccess: (updatedCard) => {
      queryClient.setQueryData(['card', cardId], updatedCard);
      queryClient.invalidateQueries({ queryKey: ['cards', updatedCard.boardId] });
      if (onCardUpdated) onCardUpdated(updatedCard);
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: (content: string) => createCommentApi(cardId, content),
    onSuccess: (comment) => {
      queryClient.setQueryData(['comments', cardId], (old: CommentItem[] = []) => [
        ...old,
        comment,
      ]);
      setNewComment('');
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: deleteCommentApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', cardId] });
    },
  });

  // Upload S3 Attachment handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !card) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      // 1. Get presigned PUT URL from backend
      const presign = await presignAttachmentApi(
        cardId,
        file.name,
        file.type || 'application/octet-stream',
      );

      // 2. Upload file directly to S3 via PUT
      const s3Response = await fetch(presign.presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });

      if (!s3Response.ok) {
        throw new Error(`S3 upload failed: ${s3Response.statusText}`);
      }

      // 3. Confirm attachment on card
      const updatedCard = await addAttachmentApi(cardId, {
        name: file.name,
        key: presign.key,
        url: presign.url,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
      });

      queryClient.setQueryData(['card', cardId], updatedCard);
      queryClient.invalidateQueries({ queryKey: ['cards', updatedCard.boardId] });
      if (onCardUpdated) onCardUpdated(updatedCard);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload attachment');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!confirm('Remove this attachment?')) return;
    await removeAttachmentApi(cardId, attachmentId);
    queryClient.invalidateQueries({ queryKey: ['card', cardId] });
    if (card) queryClient.invalidateQueries({ queryKey: ['cards', card.boardId] });
  };

  const handleTitleBlur = () => {
    if (card && title.trim() && title.trim() !== card.title) {
      updateCardMutation.mutate({ title: title.trim() });
    }
  };

  const handleSaveDescription = () => {
    if (card) {
      updateCardMutation.mutate({ description: description.trim() });
      setIsEditingDesc(false);
    }
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment.trim());
  };

  if (loadingCard || !card) {
    return (
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-slate-400">
          Loading card details...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-start justify-between gap-4 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="w-full font-black text-xl text-slate-100 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none transition-colors px-1 py-0.5 rounded"
            />
            <div className="flex items-center gap-3 mt-1.5 px-1 text-xs text-slate-400">
              <span>Version {card.version}</span>
              <span>•</span>
              <span>Updated {new Date(card.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-8 overflow-y-auto flex-1">
          {/* Description Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" /> Description
              </h4>
              {!isEditingDesc && (
                <button
                  onClick={() => setIsEditingDesc(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditingDesc ? (
              <div className="space-y-3">
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add detailed task description, checklists, or notes..."
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setDescription(card.description || '');
                      setIsEditingDesc(false);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDescription}
                    disabled={updateCardMutation.isPending}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg"
                  >
                    Save Description
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingDesc(true)}
                className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-sm text-slate-300 min-h-[60px] cursor-pointer hover:border-slate-700 transition-colors whitespace-pre-wrap"
              >
                {card.description || (
                  <span className="text-slate-500 italic">No description provided. Click to add.</span>
                )}
              </div>
            )}
          </div>

          {/* S3 Attachments Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-emerald-400" /> Attachments (
                {card.attachments?.length || 0})
              </h4>
              <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300">
                <Upload className="w-3.5 h-3.5" />
                {isUploading ? 'Uploading...' : 'Upload to S3'}
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>

            {uploadError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
                {uploadError}
              </div>
            )}

            {card.attachments && card.attachments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {card.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <Paperclip className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="overflow-hidden">
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-slate-200 hover:text-emerald-300 truncate block flex items-center gap-1"
                        >
                          {att.name} <ExternalLink className="w-3 h-3 inline shrink-0" />
                        </a>
                        <span className="text-[10px] text-slate-500">
                          {(att.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic p-3 bg-slate-950/40 rounded-xl border border-slate-800/40">
                No files attached yet.
              </div>
            )}
          </div>

          {/* Comments & Mentions Section */}
          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-400" /> Comments & Discussions (
              {comments.length})
            </h4>

            {/* Comment Stream */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <div className="text-xs text-slate-500 italic p-3 text-center">
                  No comments yet. Type below to start a discussion (use @username to mention teammates).
                </div>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1.5 group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px]">
                          {(comment.user?.name || 'User')[0]}
                        </div>
                        <span className="font-bold text-slate-200">
                          {comment.user?.name || 'User'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 text-[10px]">
                        <Clock className="w-3 h-3" />
                        {new Date(comment.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {comment.userId === user?.id && (
                          <button
                            onClick={() => deleteCommentMutation.mutate(comment.id)}
                            className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 pl-7 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Input */}
            <form onSubmit={handleSendComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment... (use @name to mention)"
                className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || addCommentMutation.isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
