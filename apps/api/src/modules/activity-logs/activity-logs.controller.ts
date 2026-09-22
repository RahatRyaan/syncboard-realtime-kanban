import {
  Controller,
  Get,
  Query,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('activity-logs')
@UseGuards(JwtAuthGuard)
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get('workspace/:workspaceId')
  async findByWorkspace(
    @Param('workspaceId') workspaceId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityLogsService.findByWorkspace(
      workspaceId,
      cursor,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('board/:boardId')
  async findByBoard(
    @Param('boardId') boardId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityLogsService.findByBoard(
      boardId,
      cursor,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('card/:cardId')
  async findByCard(
    @Param('cardId') cardId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityLogsService.findByCard(
      cardId,
      cursor,
      limit ? parseInt(limit) : 20,
    );
  }
}
