import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator';

export class UpdateBoardDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsInt()
  @Min(1)
  expectedVersion: number;
}
