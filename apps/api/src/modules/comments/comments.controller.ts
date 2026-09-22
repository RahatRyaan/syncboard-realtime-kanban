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
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('comments')
  async list(@Query('cardId') cardId: string, @Request() req: any) {
    return this.commentsService.findByCard(cardId, req.user.sub);
  }

  @Post('comments')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCommentDto, @Request() req: any) {
    return this.commentsService.create(req.user.sub, dto);
  }

  @Patch('comments/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @Request() req: any,
  ) {
    return this.commentsService.update(id, req.user.sub, dto);
  }

  @Delete('comments/:id')
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.commentsService.remove(id, req.user.sub);
  }

  @Get('notifications')
  async getNotifications(
    @Query('unreadOnly') unreadOnly: string,
    @Request() req: any,
  ) {
    return this.commentsService.getUserNotifications(
      req.user.sub,
      unreadOnly === 'true',
    );
  }

  @Patch('notifications/:id/read')
  async markNotificationAsRead(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.commentsService.markNotificationAsRead(id, req.user.sub);
  }

  @Post('notifications/read-all')
  @HttpCode(HttpStatus.OK)
  async markAllNotificationsAsRead(@Request() req: any) {
    return this.commentsService.markAllNotificationsAsRead(req.user.sub);
  }
}
