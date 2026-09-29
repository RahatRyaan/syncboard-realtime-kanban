import {
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
} from './register.dto';

export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MinLength(NAME_MIN_LENGTH, {
    message: `Name must be at least ${NAME_MIN_LENGTH} characters long`,
  })
  @MaxLength(NAME_MAX_LENGTH, {
    message: `Name must be at most ${NAME_MAX_LENGTH} characters long`,
  })
  @Matches(/\S/, { message: 'Name cannot be only whitespace' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Bio must be a string' })
  @MaxLength(300, { message: 'Bio must be at most 300 characters long' })
  bio?: string;

  @IsOptional()
  @IsString({ message: 'Job title must be a string' })
  @MaxLength(200, { message: 'Job title must be at most 200 characters long' })
  jobTitle?: string;

  @IsOptional()
  @IsString({ message: 'Location must be a string' })
  @MaxLength(80, { message: 'Location must be at most 80 characters long' })
  location?: string;

  @IsOptional()
  @IsString({ message: 'Avatar URL must be a string' })
  @MaxLength(500, { message: 'Avatar URL is too long' })
  @IsUrl(
    { require_protocol: true, protocols: ['http', 'https'] },
    { message: 'Avatar must be a valid http(s) URL' },
  )
  avatarUrl?: string;
}
