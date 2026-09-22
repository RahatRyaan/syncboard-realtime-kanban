import { IsString, IsOptional, MaxLength, IsEnum, IsNumber } from 'class-validator';

export class UpdateColumnDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsEnum(['todo', 'in-progress', 'review', 'done', 'backlog'])
  status?: string;

  @IsOptional()
  @IsString()
  rank?: string;

  @IsNumber()
  expectedVersion: number;
}