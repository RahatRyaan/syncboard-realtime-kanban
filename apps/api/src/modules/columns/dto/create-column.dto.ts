import { IsString, IsMongoId, IsOptional, MinLength, MaxLength, IsEnum } from 'class-validator';

export class CreateColumnDto {
  @IsMongoId()
  boardId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsEnum(['todo', 'in-progress', 'review', 'done', 'backlog'])
  status?: string;

  @IsOptional()
  @IsString()
  rank?: string;
}