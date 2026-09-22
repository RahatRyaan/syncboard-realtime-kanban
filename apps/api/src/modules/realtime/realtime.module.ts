import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { RealtimeGateway } from './gateways/realtime.gateway';
import { PresenceService } from './services/presence.service';
import { CardsModule } from '../cards/cards.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 30000,
    }),
    CardsModule,
    AuthModule,
  ],
  providers: [RealtimeGateway, PresenceService],
  exports: [PresenceService, RealtimeGateway],
})
export class RealtimeModule {}
