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
import { ColumnsService } from './columns.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('columns')
@UseGuards(JwtAuthGuard)
export class ColumnsController {
  constructor(private readonly columnsService: ColumnsService) {}

  @Get()
  async list(@Query('boardId') boardId: string, @Request() req: any) {
    return this.columnsService.findByBoard(boardId, req.user.sub);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateColumnDto, @Request() req: any) {
    return this.columnsService.create(req.user.sub, dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.columnsService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateColumnDto,
    @Request() req: any,
  ) {
    return this.columnsService.update(id, req.user.sub, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.columnsService.remove(id, req.user.sub);
  }
}
