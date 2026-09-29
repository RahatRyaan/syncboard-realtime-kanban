import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, LogOut, Check, Sparkles, ExternalLink, Settings } from 'lucide-react';
import { useAuth } from './providers';
import {
  getNotificationsApi,
  markNotificationAsReadApi,
  markAllNotificationsAsReadApi,
  NotificationItem,
} from '../features/comments/api';
import { socketManager } from '../shared/realtime/socket';
import { ErrorBoundary } from '../shared/ui/ErrorBoundary';
import { NetworkStatusToast } from '../shared/ui/NetworkStatusToast';
import { ThemeToggle } from '../shared/ui/ThemeToggle';

export function App() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotificationsApi(false),
    enabled: !!user,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Real-time notification listener
  useEffect(() => {
    const socket = socketManager.getSocket();
    if (socket && user) {
      const handleNewNotification = (notif: NotificationItem) => {
        queryClient.setQueryData(['notifications'], (old: NotificationItem[] = []) => [
          notif,
          ...old,
        ]);
      };

      socket.on('notification:new', handleNewNotification);
      return () => {
        socket.off('notification:new', handleNewNotification);
      };
    }
  }, [user, queryClient]);

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsReadApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsReadApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div className="min-h-screen bg-surface text-content-primary flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-line/80 bg-surface/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 font-black text-xl tracking-tight">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm shadow-md shadow-indigo-500/30">
                SB
              </span>
              <span className="bg-gradient-to-r from-content-primary to-content-muted bg-clip-text text-transparent">
                SyncBoard
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-content-muted">
              <Link
                to="/"
                className="px-3 py-1.5 rounded-md hover:text-content-primary hover:bg-panel transition-colors text-content-primary bg-panel/50"
              >
                Workspaces
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Sync Badge */}
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Sync
            </span>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 bg-panel hover:bg-panel-hover text-content-secondary rounded-xl border border-line transition-colors relative"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-panel border border-line rounded-2xl shadow-2xl z-50 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <h4 className="text-xs font-bold text-content-secondary uppercase tracking-wider">
                      Notifications ({unreadCount} unread)
                    </h4>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllReadMutation.mutate()}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <div className="text-xs text-content-faint italic text-center py-6">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            if (!notif.read) markReadMutation.mutate(notif.id);
                          }}
                          className={`p-2.5 rounded-xl border transition-all text-xs cursor-pointer ${
                            notif.read
                              ? 'bg-surface/40 border-line/60 opacity-60'
                              : 'bg-surface border-indigo-500/40 shadow-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-content-secondary">
                              {notif.content}
                            </span>
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1"></span>
                            )}
                          </div>
                          <div className="text-[10px] text-content-faint mt-1">
                            {new Date(notif.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-line">
              <ThemeToggle />

              <Link
                to="/profile"
                className="flex items-center gap-2.5 px-1.5 py-1 rounded-xl hover:bg-panel-hover transition-colors"
                title="View and edit your profile"
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="w-8 h-8 rounded-xl object-cover border border-line-strong"
                  />
                ) : (
                  <span
                    className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 border border-line-strong flex items-center justify-center text-xs font-black text-white shadow-sm"
                    aria-hidden="true"
                  >
                    {userInitials}
                  </span>
                )}
                <span className="hidden sm:block text-sm font-semibold text-content-secondary max-w-[10rem] truncate">
                  {user?.name}
                </span>
                <Settings
                  className="w-3.5 h-3.5 text-content-faint hidden sm:block"
                  aria-hidden="true"
                />
              </Link>

              <button
                onClick={handleLogout}
                className="p-2 hover:bg-panel text-content-muted hover:text-rose-400 rounded-xl transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Network & Reconnection Status Toast */}
      <NetworkStatusToast />
    </div>
  );
}
