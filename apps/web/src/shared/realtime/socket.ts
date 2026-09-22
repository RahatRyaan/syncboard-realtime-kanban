import { io, Socket } from 'socket.io-client';
import { SocketEvents } from '@syncboard/shared-types';

class SocketManager {
  private socket: Socket | null = null;
  private currentBoardId: string | null = null;

  connect(token: string) {
    if (this.socket?.connected) {
      return this.socket;
    }

    const wsUrl =
      (import.meta as any).env?.VITE_WS_URL ||
      (import.meta as any).env?.VITE_API_URL ||
      '/';

    this.socket = io(wsUrl, {
      auth: { token },
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('⚡ Socket.io connected:', this.socket?.id);
      if (this.currentBoardId) {
        this.joinBoard(this.currentBoardId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('⚡ Socket.io disconnected:', reason);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinBoard(boardId: string) {
    this.currentBoardId = boardId;
    if (this.socket?.connected) {
      this.socket.emit(SocketEvents.BOARD_JOIN, { boardId });
    }
  }

  leaveBoard(boardId: string) {
    if (this.socket?.connected) {
      this.socket.emit(SocketEvents.BOARD_LEAVE, { boardId });
    }
    if (this.currentBoardId === boardId) {
      this.currentBoardId = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketManager = new SocketManager();
