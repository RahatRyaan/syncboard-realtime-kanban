import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Card, CardSchema } from './schemas/card.schema';
import { Column, ColumnSchema } from '../columns/schemas/column.schema';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { BoardsModule } from '../boards/boards.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    BoardsModule,
    StorageModule,
    MongooseModule.forFeature([
      { name: Card.name, schema: CardSchema },
      { name: Column.name, schema: ColumnSchema },
    ]),
  ],
  controllers: [CardsController],
  providers: [CardsService],
  exports: [CardsService, MongooseModule],
})
export class CardsModule {}
