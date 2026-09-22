import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MembershipGuard, Roles } from '../../common/guards/membership.guard';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  async create(@Req() req: Request, @Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.create(req.user!.sub, dto);
  }

  @Get()
  async list(@Req() req: Request) {
    return this.workspacesService.findAllForUser(req.user!.sub);
  }

  @Get(':id')
  async findOne(@Req() req: Request, @Param('id') id: string) {
    return this.workspacesService.findById(id, req.user!.sub);
  }

  @Patch(':id')
  @UseGuards(MembershipGuard)
  @Roles('owner', 'admin')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(id, dto);
  }

  @Patch(':id/plan')
  @UseGuards(MembershipGuard)
  @Roles('owner', 'admin')
  async updatePlan(
    @Param('id') id: string,
    @Body('plan') plan: 'free' | 'pro' | 'enterprise',
  ) {
    return this.workspacesService.updatePlan(id, plan);
  }

  @Post(':id/invites')
  @UseGuards(MembershipGuard)
  @Roles('owner', 'admin')
  async createInvite(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.workspacesService.createInvite(id, req.user!.sub, dto);
  }

  @Post('invites/:token/accept')
  @HttpCode(HttpStatus.OK)
  async acceptInvite(@Req() req: Request, @Param('token') token: string) {
    return this.workspacesService.acceptInvite(token, req.user!.sub);
  }
}
