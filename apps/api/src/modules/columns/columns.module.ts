import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Column, ColumnSchema } from './schemas/column.schema';
import { ColumnsService } from './columns.service';
import { ColumnsController } from './columns.controller';
import { BoardsModule } from '../boards/boards.module';

@Module({
  imports: [
    BoardsModule,
    MongooseModule.forFeature([{ name: Column.name, schema: ColumnSchema }]),
  ],
  controllers: [ColumnsController],
  providers: [ColumnsService],
  exports: [ColumnsService, MongooseModule],
})
export class ColumnsModule {}
