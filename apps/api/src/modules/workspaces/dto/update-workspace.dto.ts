import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsIn(['free', 'pro', 'enterprise'])
  plan?: 'free' | 'pro' | 'enterprise';
}
