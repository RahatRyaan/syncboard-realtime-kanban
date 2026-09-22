import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CardsService } from '../../cards/cards.service';
import { PresenceService } from '../services/presence.service';
import { MetricsService } from '../../metrics/metrics.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  boardId?: string;
}

@WebSocketGateway({
  transports: ['websocket'],
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})
@Injectable()
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cardsService: CardsService,
    private readonly presenceService: PresenceService,
    private readonly metricsService: MetricsService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers.authorization?.split(' ')[1];
      if (!token) {
        this.logger.warn(`Connection rejected: no token from ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });
      client.userId = payload.sub;

      client.join(`user:${payload.sub}`);
      this.metricsService.activeSocketConnections.inc();
      this.logger.log(`Client connected: ${client.id} (userId: ${payload.sub})`);
    } catch (error: any) {
      this.logger.error(`Auth failed for ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.metricsService.activeSocketConnections.dec();
    if (client.userId && client.boardId) {
      this.logger.log(`Client disconnected: ${client.id} (userId: ${client.userId})`);
      this.presenceService.removeUserFromBoard(client.boardId, client.userId);
    }
  }

  @SubscribeMessage('board:join')
  async handleBoardJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { boardId: string; workspaceId?: string },
  ) {
    if (!client.userId) {
      throw new Error('Not authenticated');
    }

    const roomName = `board:${payload.boardId}`;
    client.boardId = payload.boardId;
    client.join(roomName);

    await this.presenceService.addUser(payload.boardId, client.userId);

    const onlineUsers = await this.presenceService.getOnlineUsers(payload.boardId);
    this.server.to(roomName).emit('presence:update', {
      boardId: payload.boardId,
      onlineUsers,
      action: 'join',
      userId: client.userId,
      timestamp: Date.now(),
    });

    this.logger.log(
      `User ${client.userId} joined board ${payload.boardId}. Online: ${onlineUsers.length}`,
    );

    return { success: true, onlineUsers };
  }

  @SubscribeMessage('board:leave')
  async handleBoardLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { boardId: string },
  ) {
    if (!client.userId) {
      throw new Error('Not authenticated');
    }

    const roomName = `board:${payload.boardId}`;
    client.leave(roomName);

    await this.presenceService.removeUserFromBoard(payload.boardId, client.userId);
    const onlineUsers = await this.presenceService.getOnlineUsers(payload.boardId);

    this.server.to(roomName).emit('presence:update', {
      boardId: payload.boardId,
      onlineUsers,
      action: 'leave',
      userId: client.userId,
      timestamp: Date.now(),
    });

    return { success: true };
  }

  @SubscribeMessage('card:join')
  async handleCardJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { cardId: string },
  ) {
    if (!client.userId) {
      throw new Error('Not authenticated');
    }
    client.join(`card:${payload.cardId}`);
    return { success: true };
  }

  @SubscribeMessage('card:leave')
  async handleCardLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { cardId: string },
  ) {
    if (!client.userId) {
      throw new Error('Not authenticated');
    }
    client.leave(`card:${payload.cardId}`);
    return { success: true };
  }

  @SubscribeMessage('presence:heartbeat')
  async handleHeartbeat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { boardId: string },
  ) {
    if (!client.userId) {
      throw new Error('Not authenticated');
    }

    await this.presenceService.refreshUserTTL(payload.boardId, client.userId);
    return { success: true };
  }

  @SubscribeMessage('card:move')
  async handleCardMove(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: {
      cardId: string;
      targetColumnId: string;
      targetRank: string;
      expectedVersion: number;
    },
  ) {
    if (!client.userId || !client.boardId) {
      throw new Error('Not authenticated or board not joined');
    }

    try {
      const updated = await this.cardsService.move(payload.cardId, client.userId, {
        targetColumnId: payload.targetColumnId,
        targetRank: payload.targetRank,
        expectedVersion: payload.expectedVersion,
      });

      const roomName = `board:${updated.boardId.toString()}`;
      this.server.to(roomName).emit('card:moved', {
        card: updated.toJSON(),
        action: 'moved',
        userId: client.userId,
        timestamp: Date.now(),
      });

      this.metricsService.cardMovesTotal.labels('success').inc();
      return { success: true, card: updated.toJSON() };
    } catch (error: any) {
      if (error.response?.code === 'VERSION_CONFLICT') {
        this.metricsService.cardMovesTotal.labels('conflict').inc();
        const card = await this.cardsService.findOne(payload.cardId, client.userId);
        this.server.to(client.id).emit('card:move:rejected', {
          cardId: payload.cardId,
          reason: 'VERSION_CONFLICT',
          current: card.toJSON(),
          timestamp: Date.now(),
        });
        return { success: false, error: 'VERSION_CONFLICT', current: card.toJSON() };
      }

      this.metricsService.cardMovesTotal.labels('error').inc();
      throw new Error(error.message);
    }
  }

  emitToBoard(boardId: string, event: string, data: any) {
    if (this.server) {
      this.server.to(`board:${boardId}`).emit(event, data);
    }
  }

  emitToCard(cardId: string, event: string, data: any) {
    if (this.server) {
      this.server.to(`card:${cardId}`).emit(event, data);
    }
  }

  emitToUser(userId: string, event: string, data: any) {
    if (this.server) {
      this.server.to(`user:${userId}`).emit(event, data);
    }
  }
}
