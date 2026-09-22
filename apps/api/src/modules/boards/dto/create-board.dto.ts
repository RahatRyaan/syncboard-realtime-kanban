import { IsString, IsMongoId, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateBoardDto {
  @IsMongoId()
  workspaceId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
