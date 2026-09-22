import { IsString, IsNumber, MinLength, MaxLength, Min, IsUrl } from 'class-validator';

export class AddAttachmentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsString()
  @MinLength(1)
  key: string;

  @IsString()
  @IsUrl({ require_tld: false })
  url: string;

  @IsNumber()
  @Min(0)
  size: number;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  mimeType: string;
}
