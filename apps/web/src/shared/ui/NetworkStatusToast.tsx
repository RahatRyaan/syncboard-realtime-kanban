import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, AlertTriangle } from 'lucide-react';
import { socketManager } from '../realtime/socket';

export function NetworkStatusToast() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(true);
  const [showReconnected, setShowReconnected] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 4000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const socket = socketManager.getSocket();
    if (socket) {
      const handleConnect = () => {
        setIsSocketConnected(true);
      };
      const handleDisconnect = () => {
        setIsSocketConnected(false);
      };

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);

      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="fixed bottom-6 right-6 z-50 p-4 bg-rose-950/90 border border-rose-500/40 text-rose-200 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md animate-bounce">
        <WifiOff className="w-5 h-5 text-rose-400 shrink-0" />
        <div className="text-xs">
          <p className="font-bold">Offline mode</p>
          <p className="text-rose-300/80">Changes will synchronize when your connection is restored.</p>
        </div>
      </div>
    );
  }

  if (!isSocketConnected) {
    return (
      <div className="fixed bottom-6 right-6 z-50 p-3.5 bg-amber-950/90 border border-amber-500/40 text-amber-200 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
        <div className="text-xs">
          <p className="font-semibold">Reconnecting to live sync...</p>
        </div>
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div className="fixed bottom-6 right-6 z-50 p-3.5 bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 rounded-2xl shadow-2xl flex items-center gap-2.5 backdrop-blur-md transition-all">
        <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
        <div className="text-xs font-semibold">Back online. Sync active.</div>
      </div>
    );
  }

  return null;
}
