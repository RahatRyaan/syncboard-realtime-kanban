import { IsString, IsMongoId, IsOptional, MaxLength, IsArray, IsNumber } from 'class-validator';

export class UpdateCardDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  rank?: string;

  @IsOptional()
  @IsMongoId()
  columnId?: string;

  @IsOptional()
  @IsArray()
  assigneeIds?: string[];

  @IsOptional()
  @IsArray()
  labels?: string[];

  @IsNumber()
  expectedVersion: number;
}
