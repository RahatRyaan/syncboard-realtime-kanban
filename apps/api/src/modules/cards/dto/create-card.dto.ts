import { IsString, IsMongoId, IsOptional, MinLength, MaxLength, IsArray, IsEnum } from 'class-validator';

export class CreateCardDto {
  @IsMongoId()
  boardId: string;

  @IsMongoId()
  columnId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  rank?: string;

  @IsOptional()
  @IsArray()
  assigneeIds?: string[];

  @IsOptional()
  @IsArray()
  labels?: string[];
}
