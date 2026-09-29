import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 60;

export class RegisterDto {
  @IsEmail({}, { message: 'Enter a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(254, { message: 'Email is too long' })
  email: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
  })
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters long`,
  })
  @Matches(/[a-z]/, { message: 'Password must include a lowercase letter' })
  @Matches(/[A-Z]/, { message: 'Password must include an uppercase letter' })
  @Matches(/[0-9]/, { message: 'Password must include a number' })
  password: string;

  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(NAME_MIN_LENGTH, {
    message: `Name must be at least ${NAME_MIN_LENGTH} characters long`,
  })
  @MaxLength(NAME_MAX_LENGTH, {
    message: `Name must be at most ${NAME_MAX_LENGTH} characters long`,
  })
  @Matches(/\S/, { message: 'Name cannot be only whitespace' })
  name: string;
}
