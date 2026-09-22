import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { MoveCardDto } from './dto/move-card.dto';
import { PresignAttachmentDto } from './dto/presign-attachment.dto';
import { AddAttachmentDto } from './dto/add-attachment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MembershipGuard, Roles } from '../../common/guards/membership.guard';

@Controller('cards')
@UseGuards(JwtAuthGuard)
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get()
  async list(
    @Query('boardId') boardId: string,
    @Query('columnId') columnId?: string,
  ) {
    return this.cardsService.findByBoard(boardId, columnId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCardDto, @Request() req: any) {
    return this.cardsService.create(req.user.sub, dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.cardsService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCardDto,
    @Request() req: any,
  ) {
    return this.cardsService.update(id, req.user.sub, dto);
  }

  @Patch(':id/move')
  async move(
    @Param('id') id: string,
    @Body() dto: MoveCardDto,
    @Request() req: any,
  ) {
    return this.cardsService.move(id, req.user.sub, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.cardsService.remove(id, req.user.sub);
  }

  @Post(':id/attachments/presign')
  async presignAttachment(
    @Param('id') id: string,
    @Body() dto: PresignAttachmentDto,
    @Request() req: any,
  ) {
    return this.cardsService.getPresignedAttachmentUrl(id, req.user.sub, dto);
  }

  @Post(':id/attachments')
  @HttpCode(HttpStatus.CREATED)
  async addAttachment(
    @Param('id') id: string,
    @Body() dto: AddAttachmentDto,
    @Request() req: any,
  ) {
    return this.cardsService.addAttachment(id, req.user.sub, dto);
  }

  @Delete(':id/attachments/:attachmentId')
  async removeAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Request() req: any,
  ) {
    return this.cardsService.removeAttachment(id, attachmentId, req.user.sub);
  }
}
