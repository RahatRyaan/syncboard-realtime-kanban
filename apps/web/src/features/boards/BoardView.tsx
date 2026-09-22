import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  ArrowLeft,
  Users,
  Layers,
  Paperclip,
  MessageSquare,
  Activity,
  Trash2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Card, Column, Board } from '@syncboard/shared-types';
import { getBoardById } from './api';
import { getColumnsByBoard, createColumnApi, deleteColumnApi } from '../columns/api';
import {
  getCardsByBoard,
  createCardApi,
  moveCardApi,
  deleteCardApi,
} from '../cards/api';
import { getActivityLogsByBoard } from '../comments/api';
import { socketManager } from '../../shared/realtime/socket';
import { CardDetailModal } from '../cards/CardDetailModal';
import { useAuth } from '../../app/providers';

// --- Card Item Component ---
interface SortableCardItemProps {
  card: Card;
  onClick: () => void;
}

function SortableCardItem({ card, onClick }: SortableCardItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: 'Card', card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="p-3.5 bg-slate-900 border border-slate-800/90 hover:border-indigo-500/50 rounded-xl cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all group select-none space-y-2.5"
    >
      <div className="font-semibold text-sm text-slate-100 group-hover:text-indigo-200 transition-colors">
        {card.title}
      </div>

      {card.description && (
        <p className="text-xs text-slate-400 line-clamp-2">{card.description}</p>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
        <div className="flex items-center gap-3">
          {card.attachments && card.attachments.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400">
              <Paperclip className="w-3 h-3" />
              {card.attachments.length}
            </span>
          )}
          <span className="text-[10px] bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-400 font-mono">
            v{card.version}
          </span>
        </div>
      </div>
    </div>
  );
}

// --- Column Droppable Container ---
interface KanbanColumnProps {
  column: Column;
  cards: Card[];
  onAddCard: (columnId: string) => void;
  onCardClick: (cardId: string) => void;
  onDeleteColumn: (columnId: string) => void;
}

function KanbanColumn({
  column,
  cards,
  onAddCard,
  onCardClick,
  onDeleteColumn,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: { type: 'Column', column },
  });

  const cardIds = useMemo(() => cards.map((c) => c.id), [cards]);

  return (
    <div
      ref={setNodeRef}
      className="w-80 shrink-0 bg-slate-900/50 border border-slate-800/80 rounded-2xl flex flex-col max-h-[80vh] overflow-hidden"
    >
      {/* Column Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/80">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
          <h3 className="font-bold text-sm text-slate-200">{column.title}</h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
            {cards.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAddCard(column.id)}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg transition-colors"
            title="Add card"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDeleteColumn(column.id)}
            className="p-1 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
            title="Delete column"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Cards List (Sortable Area) */}
      <div className="p-3 overflow-y-auto space-y-2.5 flex-1 min-h-[120px]">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCardItem
              key={card.id}
              card={card}
              onClick={() => onCardClick(card.id)}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className="h-20 border border-dashed border-slate-800/60 rounded-xl flex items-center justify-center text-xs text-slate-600">
            Drop cards here
          </div>
        )}
      </div>

      {/* Column Footer */}
      <div className="p-2.5 border-t border-slate-800/60 bg-slate-900/30">
        <button
          onClick={() => onAddCard(column.id)}
          className="w-full py-1.5 text-xs text-slate-400 hover:text-indigo-300 hover:bg-slate-800/60 rounded-lg font-semibold flex items-center justify-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add card
        </button>
      </div>
    </div>
  );
}

// --- Main BoardView Component ---
export function BoardView() {
  const { boardId } = useParams<{ boardId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');
  const [newCardTargetCol, setNewCardTargetCol] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [showActivityDrawer, setShowActivityDrawer] = useState(false);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);

  // Sensors for Drag and Drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Queries
  const { data: board, isLoading: loadingBoard } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => getBoardById(boardId!),
    enabled: !!boardId,
  });

  const { data: columns = [], isLoading: loadingColumns } = useQuery({
    queryKey: ['columns', boardId],
    queryFn: () => getColumnsByBoard(boardId!),
    enabled: !!boardId,
  });

  const { data: cards = [], isLoading: loadingCards } = useQuery({
    queryKey: ['cards', boardId],
    queryFn: () => getCardsByBoard(boardId!),
    enabled: !!boardId,
  });

  const { data: activityLogs } = useQuery({
    queryKey: ['activity', boardId],
    queryFn: () => getActivityLogsByBoard(boardId!),
    enabled: !!boardId && showActivityDrawer,
  });

  // Real-time Socket Connection, Presence & Room Events
  useEffect(() => {
    if (!boardId) return;

    const socket = socketManager.getSocket();
    if (socket) {
      socket.emit('board:join', { boardId });

      // Presence update listener
      const handlePresence = (payload: { onlineUsers: string[] }) => {
        if (payload?.onlineUsers) setOnlineUsers(payload.onlineUsers);
      };

      // Card moved live broadcast from another user
      const handleCardMoved = (payload: { card: Card }) => {
        if (payload?.card) {
          queryClient.setQueryData(['cards', boardId], (old: Card[] = []) => {
            const index = old.findIndex((c) => c.id === payload.card.id);
            if (index === -1) return [...old, payload.card];
            const updated = [...old];
            updated[index] = payload.card;
            return updated;
          });
        }
      };

      // Version conflict rejection
      const handleCardMoveRejected = (payload: { cardId: string; reason: string; current: Card }) => {
        setConflictNotice('A collaborator moved or updated this card. Syncing to latest version.');
        setTimeout(() => setConflictNotice(null), 5000);
        queryClient.invalidateQueries({ queryKey: ['cards', boardId] });
      };

      socket.on('presence:update', handlePresence);
      socket.on('card:moved', handleCardMoved);
      socket.on('card:move:rejected', handleCardMoveRejected);

      // Heartbeat every 15 seconds
      const heartbeat = setInterval(() => {
        socket.emit('presence:heartbeat', { boardId });
      }, 15000);

      return () => {
        clearInterval(heartbeat);
        socket.emit('board:leave', { boardId });
        socket.off('presence:update', handlePresence);
        socket.off('card:moved', handleCardMoved);
        socket.off('card:move:rejected', handleCardMoveRejected);
      };
    }
  }, [boardId, queryClient]);

  // Mutations
  const createColumnMutation = useMutation({
    mutationFn: createColumnApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['columns', boardId] });
      setIsAddingColumn(false);
      setNewColTitle('');
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: deleteColumnApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['columns', boardId] });
    },
  });

  const createCardMutation = useMutation({
    mutationFn: createCardApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] });
      setNewCardTargetCol(null);
      setNewCardTitle('');
    },
  });

  // Drag Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = cards.find((c) => c.id === active.id);
    if (card) setActiveCard(card);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeCardId = active.id as string;
    const overId = over.id as string;

    const sourceCard = cards.find((c) => c.id === activeCardId);
    if (!sourceCard) return;

    // Check if dropping directly on a column or another card
    const targetColumn =
      columns.find((c) => c.id === overId) ||
      columns.find((c) => c.id === cards.find((other) => other.id === overId)?.columnId);

    if (!targetColumn) return;

    const targetColumnId = targetColumn.id;
    const cardsInTarget = cards.filter((c) => c.columnId === targetColumnId && c.id !== activeCardId);

    // Calculate new rank
    const overCardIndex = cardsInTarget.findIndex((c) => c.id === overId);
    const newIndex = overCardIndex >= 0 ? overCardIndex : cardsInTarget.length;
    const targetRank = `a${Date.now().toString(36).slice(-6)}`;

    // Optimistically update local cache
    queryClient.setQueryData(['cards', boardId], (old: Card[] = []) => {
      return old.map((c) => {
        if (c.id === activeCardId) {
          return {
            ...c,
            columnId: targetColumnId,
            rank: targetRank,
            version: c.version + 1,
          };
        }
        return c;
      });
    });

    // Emit live card:move socket event
    const socket = socketManager.getSocket();
    if (socket?.connected) {
      socket.emit('card:move', {
        cardId: activeCardId,
        targetColumnId,
        targetRank,
        expectedVersion: sourceCard.version,
      });
    }

    // Call REST API for persistence
    try {
      await moveCardApi(activeCardId, {
        targetColumnId,
        targetRank,
        expectedVersion: sourceCard.version,
      });
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] });
    } catch {
      // Rollback on conflict or network failure
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] });
    }
  };

  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColTitle.trim() || !boardId) return;
    createColumnMutation.mutate({
      boardId,
      title: newColTitle.trim(),
    });
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardTitle.trim() || !boardId || !newCardTargetCol) return;
    createCardMutation.mutate({
      boardId,
      columnId: newCardTargetCol,
      title: newCardTitle.trim(),
    });
  };

  if (loadingBoard || loadingColumns) {
    return (
      <div className="flex items-center justify-center p-24 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mr-3"></div>
        Loading Kanban Board...
      </div>
    );
  }

  if (!board) {
    return (
      <div className="p-12 text-center text-slate-400">
        Board not found.{' '}
        <Link to="/" className="text-indigo-400 underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-950 overflow-hidden">
      {/* Board Top Header */}
      <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-950 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold text-slate-100">{board.title}</h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
                v{board.version}
              </span>
            </div>
            {board.description && (
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{board.description}</p>
            )}
          </div>
        </div>

        {/* Presence Avatars & Actions */}
        <div className="flex items-center gap-3">
          {/* Live Collaborators Presence Stack */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-300 mr-1.5">
              {onlineUsers.length || 1} online
            </span>
            <div className="flex -space-x-1.5 overflow-hidden">
              <div
                className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center border border-slate-900"
                title={user?.name || 'You'}
              >
                {(user?.name || 'U')[0]}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowActivityDrawer(!showActivityDrawer)}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition-colors"
            title="Activity Feed"
          >
            <Activity className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsAddingColumn(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add Column
          </button>
        </div>
      </div>

      {/* Concurrency Conflict Notification Alert */}
      {conflictNotice && (
        <div className="px-6 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {conflictNotice}
        </div>
      )}

      {/* Kanban Board Canvas */}
      <div className="flex-1 flex overflow-x-auto p-6 gap-6 items-start">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              cards={cards.filter((c) => c.columnId === column.id)}
              onAddCard={(colId) => setNewCardTargetCol(colId)}
              onCardClick={(cardId) => setSelectedCardId(cardId)}
              onDeleteColumn={(colId) => {
                if (confirm(`Delete column "${column.title}"?`)) {
                  deleteColumnMutation.mutate(colId);
                }
              }}
            />
          ))}

          <DragOverlay>
            {activeCard ? (
              <div className="p-3.5 bg-slate-900 border border-indigo-500 rounded-xl shadow-2xl scale-105 opacity-90 rotate-2 select-none">
                <div className="font-semibold text-sm text-slate-100">{activeCard.title}</div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Add Column Card */}
        {isAddingColumn ? (
          <div className="w-80 shrink-0 bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase">New Column</h4>
            <form onSubmit={handleAddColumn} className="space-y-3">
              <input
                type="text"
                required
                autoFocus
                value={newColTitle}
                onChange={(e) => setNewColTitle(e.target.value)}
                placeholder="Column title (e.g. In Review)"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingColumn(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createColumnMutation.isPending}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingColumn(true)}
            className="w-80 shrink-0 h-32 border border-dashed border-slate-800/80 hover:border-slate-600 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 transition-all gap-2"
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs font-semibold">Add another column</span>
          </button>
        )}
      </div>

      {/* Modal: Add Card */}
      {newCardTargetCol && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100">Create New Card</h3>
            <form onSubmit={handleAddCard} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Card Title
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  placeholder="Task summary..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setNewCardTargetCol(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCardMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl"
                >
                  {createCardMutation.isPending ? 'Creating...' : 'Create Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Card Detail Modal */}
      {selectedCardId && (
        <CardDetailModal
          cardId={selectedCardId}
          onClose={() => setSelectedCardId(null)}
          onCardUpdated={(updated) => {
            queryClient.setQueryData(['cards', boardId], (old: Card[] = []) =>
              old.map((c) => (c.id === updated.id ? updated : c)),
            );
          }}
        />
      )}

      {/* Activity Log Drawer */}
      {showActivityDrawer && (
        <div className="fixed inset-y-0 right-0 w-80 bg-slate-900 border-l border-slate-800 z-40 p-6 flex flex-col space-y-4 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" /> Activity Feed
            </h3>
            <button
              onClick={() => setShowActivityDrawer(false)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3">
            {activityLogs?.data && activityLogs.data.length > 0 ? (
              activityLogs.data.map((log: any) => (
                <div
                  key={log.id || log._id}
                  className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs space-y-1"
                >
                  <div className="font-semibold text-slate-200 capitalize">
                    {log.action.replace('.', ' ')}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 italic text-center p-6">
                No recent activity logs.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
