import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DemoSeedService } from './demo-seed.service';
import { DemoController } from './demo.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Workspace, WorkspaceSchema } from '../workspaces/schemas/workspace.schema';
import { Board, BoardSchema } from '../boards/schemas/board.schema';
import { Column, ColumnSchema } from '../columns/schemas/column.schema';
import { Card, CardSchema } from '../cards/schemas/card.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Workspace.name, schema: WorkspaceSchema },
      { name: Board.name, schema: BoardSchema },
      { name: Column.name, schema: ColumnSchema },
      { name: Card.name, schema: CardSchema },
    ]),
  ],
  controllers: [DemoController],
  providers: [DemoSeedService],
  exports: [DemoSeedService],
})
export class DemoModule {}
