import { IsInt, IsNotEmpty, IsString, Matches, Max, Min } from 'class-validator';

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export class AvatarPresignDto {
  @IsString()
  @IsNotEmpty({ message: 'File name is required' })
  @Max(255, { message: 'File name is too long' })
  fileName: string;

  @IsString()
  @IsNotEmpty({ message: 'Content type is required' })
  @Matches(/^image\/(jpeg|png|webp)$/, {
    message: 'Avatar must be a JPEG, PNG, or WebP image',
  })
  mimeType: string;

  @IsInt({ message: 'Size must be an integer number of bytes' })
  @Min(1, { message: 'File is empty' })
  @Max(AVATAR_MAX_BYTES, { message: 'Avatar must be 2 MB or smaller' })
  size: number;
}
