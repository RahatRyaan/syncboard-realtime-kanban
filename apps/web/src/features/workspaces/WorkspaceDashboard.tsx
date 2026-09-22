import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Users,
  Layout,
  UserPlus,
  Trash2,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
  Zap,
  Check,
  AlertTriangle,
} from 'lucide-react';
import {
  getWorkspacesApi,
  createWorkspaceApi,
  inviteWorkspaceMemberApi,
  updateWorkspacePlanApi,
  Workspace,
} from './api';
import {
  getBoardsByWorkspace,
  createBoardApi,
  deleteBoardApi,
  searchWorkspaceApi,
} from '../boards/api';
import { useAuth } from '../../app/providers';

export function WorkspaceDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newBoardDesc, setNewBoardDesc] = useState('');

  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin' | 'viewer'>('member');
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string>('');

  // Fetch all workspaces
  const { data: workspaces = [], isLoading: loadingWorkspaces } = useQuery({
    queryKey: ['workspaces'],
    queryFn: getWorkspacesApi,
  });

  const activeWorkspace =
    workspaces.find((w) => w.id === selectedWorkspaceId) || workspaces[0] || null;

  const currentWorkspaceId = activeWorkspace?.id;
  const isFreePlan = activeWorkspace?.plan === 'free' || !activeWorkspace?.plan;

  // Fetch boards for active workspace
  const { data: boards = [], isLoading: loadingBoards } = useQuery({
    queryKey: ['boards', currentWorkspaceId],
    queryFn: () => (currentWorkspaceId ? getBoardsByWorkspace(currentWorkspaceId) : []),
    enabled: !!currentWorkspaceId,
  });

  // Search query
  const { data: searchResults } = useQuery({
    queryKey: ['search', currentWorkspaceId, searchQuery],
    queryFn: () =>
      currentWorkspaceId && searchQuery.trim().length > 1
        ? searchWorkspaceApi(currentWorkspaceId, searchQuery.trim())
        : null,
    enabled: !!currentWorkspaceId && searchQuery.trim().length > 1,
  });

  // Create Board mutation
  const createBoardMutation = useMutation({
    mutationFn: createBoardApi,
    onSuccess: (newBoard) => {
      queryClient.invalidateQueries({ queryKey: ['boards', currentWorkspaceId] });
      setIsCreatingBoard(false);
      setNewBoardTitle('');
      setNewBoardDesc('');
      navigate(`/boards/${newBoard.id}`);
    },
    onError: (err: any) => {
      if (err.status === 403 || err.message?.includes('capped at 3 boards')) {
        setUpgradeReason('Free plan is limited to 3 boards per workspace. Upgrade to Pro for unlimited boards.');
        setShowUpgradeModal(true);
      }
    },
  });

  // Create Workspace mutation
  const createWorkspaceMutation = useMutation({
    mutationFn: createWorkspaceApi,
    onSuccess: (newWs) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setSelectedWorkspaceId(newWs.id);
      setIsCreatingWorkspace(false);
      setNewWorkspaceName('');
    },
  });

  // Delete Board mutation
  const deleteBoardMutation = useMutation({
    mutationFn: deleteBoardApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', currentWorkspaceId] });
    },
  });

  // Invite Member mutation
  const inviteMemberMutation = useMutation({
    mutationFn: () =>
      inviteWorkspaceMemberApi(currentWorkspaceId!, inviteEmail, inviteRole),
    onSuccess: (data) => {
      setInviteSuccess(data.inviteUrl || 'Invite created successfully!');
      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
    onError: (err: any) => {
      if (err.status === 403 || err.message?.includes('capped at 2 members')) {
        setUpgradeReason('Free plan is limited to 2 members per workspace. Upgrade to Pro for unlimited team members.');
        setShowUpgradeModal(true);
      }
    },
  });

  // Upgrade Plan mutation (Simulation)
  const updatePlanMutation = useMutation({
    mutationFn: (newPlan: 'free' | 'pro') =>
      updateWorkspacePlanApi(currentWorkspaceId!, newPlan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setShowUpgradeModal(false);
    },
  });

  const handleCreateBoard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardTitle.trim() || !currentWorkspaceId) return;

    if (isFreePlan && boards.length >= 3) {
      setUpgradeReason('Free plan is limited to 3 boards per workspace. Upgrade to Pro for unlimited boards.');
      setShowUpgradeModal(true);
      return;
    }

    createBoardMutation.mutate({
      workspaceId: currentWorkspaceId,
      title: newBoardTitle.trim(),
      description: newBoardDesc.trim(),
    });
  };

  const handleOpenInvite = () => {
    if (isFreePlan && (activeWorkspace?.members.length || 1) >= 2) {
      setUpgradeReason('Free plan is limited to 2 team members. Upgrade to Pro for unlimited collaboration.');
      setShowUpgradeModal(true);
      return;
    }
    setIsInviting(true);
  };

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    createWorkspaceMutation.mutate(newWorkspaceName.trim());
  };

  if (loadingWorkspaces) {
    return (
      <div className="flex items-center justify-center p-24 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mr-3"></div>
        Loading workspaces...
      </div>
    );
  }

  // If user has no workspaces, show onboarding creation
  if (workspaces.length === 0) {
    return (
      <div className="max-w-lg mx-auto p-12 mt-12 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Layers className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-100">Create your first Workspace</h2>
        <p className="text-slate-400 text-sm">
          A workspace groups your team's boards, documents, and collaboration channels.
        </p>
        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          <input
            type="text"
            required
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            placeholder="e.g. Engineering, Acme Corp"
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
          <button
            type="submit"
            disabled={createWorkspaceMutation.isPending}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all text-sm"
          >
            {createWorkspaceMutation.isPending ? 'Creating...' : 'Create Workspace'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Workspace Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800/80 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <select
              value={currentWorkspaceId || ''}
              onChange={(e) => setSelectedWorkspaceId(e.target.value)}
              className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-lg font-bold text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setIsCreatingWorkspace(true)}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition-colors"
              title="Create new workspace"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2.5 text-slate-400 text-sm">
            <span>{activeWorkspace?.members.length || 1} team members</span>
            <span>•</span>
            <span
              onClick={() => {
                setUpgradeReason('Manage workspace plan limits and billing.');
                setShowUpgradeModal(true);
              }}
              className={`cursor-pointer capitalize px-2.5 py-0.5 rounded-full text-xs font-bold transition-all ${
                isFreePlan
                  ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-indigo-500'
                  : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {activeWorkspace?.plan || 'free'} plan
            </span>
            {isFreePlan && (
              <button
                onClick={() => {
                  setUpgradeReason('Upgrade to Pro for unlimited boards, members, and advanced features.');
                  setShowUpgradeModal(true);
                }}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <Zap className="w-3.5 h-3.5" /> Upgrade
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleOpenInvite}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-medium rounded-xl border border-slate-800 transition-colors text-sm flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4 text-indigo-400" />
            Invite Member
          </button>
          <button
            onClick={() => setIsCreatingBoard(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Board
          </button>
        </div>
      </div>

      {/* Free Plan Limit Notice if Near Cap */}
      {isFreePlan && boards.length >= 3 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-xs text-amber-200">
              <span className="font-bold">Free Plan Limit Reached:</span> You are using all 3 of your free boards. Upgrade to Pro for unlimited boards and members.
            </div>
          </div>
          <button
            onClick={() => {
              setUpgradeReason('Upgrade to Pro to create unlimited boards and invite more collaborators.');
              setShowUpgradeModal(true);
            }}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shrink-0"
          >
            Upgrade to Pro
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search boards, cards, and descriptions in this workspace..."
          className="w-full pl-12 pr-4 py-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all text-sm backdrop-blur-sm"
        />
      </div>

      {/* Search Results if query exists */}
      {searchQuery.trim().length > 1 && searchResults && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Search Results ({searchResults.totalResults})
            </h3>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Clear search
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {searchResults.boards.map((b: any) => (
              <Link
                key={b.id || b._id}
                to={`/boards/${b.id || b._id}`}
                className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl hover:border-indigo-500/50 transition-all block"
              >
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase">
                  <Layout className="w-3.5 h-3.5" /> Board
                </div>
                <div className="font-bold text-slate-100 mt-1">{b.title}</div>
                {b.description && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {b.description}
                  </p>
                )}
              </Link>
            ))}

            {searchResults.cards.map((c: any) => (
              <Link
                key={c.id || c._id}
                to={`/boards/${c.boardId}?cardId=${c.id || c._id}`}
                className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl hover:border-purple-500/50 transition-all block"
              >
                <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold uppercase">
                  <Sparkles className="w-3.5 h-3.5" /> Card
                </div>
                <div className="font-bold text-slate-100 mt-1">{c.title}</div>
                {c.description && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {c.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Boards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Layout className="w-5 h-5 text-indigo-400" />
            Boards ({boards.length}{isFreePlan ? '/3' : ''})
          </h2>
        </div>

        {loadingBoards ? (
          <div className="p-12 text-center text-slate-500">Loading boards...</div>
        ) : boards.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-3">
            <Layout className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-slate-300 font-semibold">No boards yet</p>
            <p className="text-slate-500 text-xs">
              Create your first Kanban board to start organizing tasks.
            </p>
            <button
              onClick={() => setIsCreatingBoard(true)}
              className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl"
            >
              + Create Board
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {boards.map((board) => (
              <div
                key={board.id}
                className="p-6 bg-slate-900/80 border border-slate-800/80 hover:border-indigo-500/50 rounded-2xl transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20">
                      v{board.version || 1}
                    </span>
                    <button
                      onClick={() => {
                        if (confirm(`Delete board "${board.title}"?`)) {
                          deleteBoardMutation.mutate(board.id);
                        }
                      }}
                      className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      title="Delete board"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="text-lg font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                    {board.title}
                  </h3>
                  <p className="text-sm text-slate-400 mt-2 line-clamp-2">
                    {board.description || 'No description provided'}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Updated {new Date(board.updatedAt).toLocaleDateString()}
                  </span>
                  <Link
                    to={`/boards/${board.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    Open Board <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create Board */}
      {isCreatingBoard && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl space-y-5">
            <h3 className="text-lg font-bold text-slate-100">Create New Board</h3>
            <form onSubmit={handleCreateBoard} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Board Title
                </label>
                <input
                  type="text"
                  required
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  placeholder="e.g. Q4 Sprint, Product Launch"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  rows={3}
                  value={newBoardDesc}
                  onChange={(e) => setNewBoardDesc(e.target.value)}
                  placeholder="Brief summary of this board's purpose..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingBoard(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBoardMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl"
                >
                  {createBoardMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Workspace */}
      {isCreatingWorkspace && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl space-y-5">
            <h3 className="text-lg font-bold text-slate-100">Create New Workspace</h3>
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="e.g. Design Team, Growth"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingWorkspace(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createWorkspaceMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl"
                >
                  {createWorkspaceMutation.isPending ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Invite Member */}
      {isInviting && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl space-y-5">
            <h3 className="text-lg font-bold text-slate-100">Invite Team Member</h3>
            {inviteSuccess ? (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl">
                  Invite Link Generated!
                </div>
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 select-all break-all">
                  {inviteSuccess}
                </div>
                <button
                  onClick={() => {
                    setIsInviting(false);
                    setInviteSuccess(null);
                  }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm"
                >
                  Done
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  inviteMemberMutation.mutate();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="member">Member (Can edit boards & cards)</option>
                    <option value="admin">Admin (Can manage settings)</option>
                    <option value="viewer">Viewer (Read-only)</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsInviting(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteMemberMutation.isPending}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl"
                  >
                    {inviteMemberMutation.isPending ? 'Sending...' : 'Generate Invite'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Upgrade to Pro / Billing Simulation */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black text-slate-100">
                {isFreePlan ? 'Upgrade to SyncBoard Pro' : 'Manage Subscription'}
              </h3>
              <p className="text-xs text-slate-400">
                {upgradeReason || 'Supercharge your team with unlimited collaboration and storage.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase">Free Plan</div>
                <div className="text-lg font-black text-slate-200">$0<span className="text-xs text-slate-500 font-normal">/mo</span></div>
                <ul className="text-xs text-slate-400 space-y-1">
                  <li>• Max 3 Boards</li>
                  <li>• Max 2 Team Members</li>
                  <li>• Standard S3 Storage</li>
                </ul>
              </div>

              <div className="p-4 bg-indigo-950/30 border border-indigo-500/40 rounded-2xl space-y-2 relative overflow-hidden">
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-indigo-500 text-white rounded text-[10px] font-bold">
                  POPULAR
                </div>
                <div className="text-xs font-bold text-indigo-400 uppercase">Pro Plan</div>
                <div className="text-lg font-black text-slate-100">$12<span className="text-xs text-slate-400 font-normal">/seat/mo</span></div>
                <ul className="text-xs text-slate-300 space-y-1">
                  <li className="flex items-center gap-1"><Check className="w-3 h-3 text-indigo-400" /> Unlimited Boards</li>
                  <li className="flex items-center gap-1"><Check className="w-3 h-3 text-indigo-400" /> Unlimited Members</li>
                  <li className="flex items-center gap-1"><Check className="w-3 h-3 text-indigo-400" /> Real-time Presence</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl"
              >
                Close
              </button>
              {isFreePlan ? (
                <button
                  type="button"
                  disabled={updatePlanMutation.isPending}
                  onClick={() => updatePlanMutation.mutate('pro')}
                  className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-4 h-4" />
                  {updatePlanMutation.isPending ? 'Upgrading...' : 'Simulate Pro Upgrade'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={updatePlanMutation.isPending}
                  onClick={() => updatePlanMutation.mutate('free')}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl"
                >
                  {updatePlanMutation.isPending ? 'Downgrading...' : 'Switch to Free'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
