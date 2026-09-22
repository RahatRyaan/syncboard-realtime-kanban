import { Injectable } from '@nestjs/common';
import { Document } from '@syncboard/shared-types';

@Injectable()
export class DocumentsService {
  async findOne(id: string): Promise<Document | null> {
    return {
      id,
      workspaceId: 'ws_placeholder',
      title: 'Sample Document',
      body: '',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async create(body: { workspaceId: string; title: string; body?: string }): Promise<Document> {
    return {
      id: 'doc_placeholder',
      workspaceId: body.workspaceId,
      title: body.title,
      body: body.body || '',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async update(id: string, body: { title?: string; body?: string; expectedVersion: number }): Promise<Document> {
    return {
      id,
      workspaceId: 'ws_placeholder',
      title: body.title || 'Sample Document',
      body: body.body || '',
      version: body.expectedVersion + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
