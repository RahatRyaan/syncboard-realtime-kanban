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
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MembershipGuard, Roles } from '../../common/guards/membership.guard';

@Controller('boards')
@UseGuards(JwtAuthGuard)
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Get()
  async list(@Query('workspaceId') workspaceId: string, @Request() req: any) {
    return this.boardsService.findByWorkspace(workspaceId, req.user.sub);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateBoardDto, @Request() req: any) {
    return this.boardsService.create(req.user.sub, dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.boardsService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  @UseGuards(MembershipGuard)
  @Roles('owner', 'admin')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBoardDto,
    @Request() req: any,
  ) {
    return this.boardsService.update(id, req.user.sub, dto);
  }

  @Delete(':id')
  @UseGuards(MembershipGuard)
  @Roles('owner', 'admin')
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.boardsService.remove(id, req.user.sub);
  }
}
