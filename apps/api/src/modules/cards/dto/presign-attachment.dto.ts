import { IsString, MinLength, MaxLength } from 'class-validator';

export class PresignAttachmentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  mimeType: string;
}
