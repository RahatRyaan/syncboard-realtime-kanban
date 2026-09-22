import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Post()
  async create(@Body() body: { workspaceId: string; title: string; body?: string }) {
    return this.documentsService.create(body);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { title?: string; body?: string; expectedVersion: number },
  ) {
    return this.documentsService.update(id, body);
  }
}
