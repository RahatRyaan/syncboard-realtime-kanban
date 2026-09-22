import { IsString, IsMongoId, IsOptional, MaxLength, IsNumber } from 'class-validator';

export class MoveCardDto {
  @IsMongoId()
  targetColumnId: string;

  @IsString()
  targetRank: string;

  @IsNumber()
  expectedVersion: number;
}
