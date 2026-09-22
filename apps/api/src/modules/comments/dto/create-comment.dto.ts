import { IsString, IsMongoId, MinLength, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsMongoId()
  cardId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;
}
