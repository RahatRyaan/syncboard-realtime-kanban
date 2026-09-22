import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { Board, BoardSchema } from '../boards/schemas/board.schema';
import { Card, CardSchema } from '../cards/schemas/card.schema';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    WorkspacesModule,
    AuthModule,
    MongooseModule.forFeature([
      { name: Board.name, schema: BoardSchema },
      { name: Card.name, schema: CardSchema },
    ]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
