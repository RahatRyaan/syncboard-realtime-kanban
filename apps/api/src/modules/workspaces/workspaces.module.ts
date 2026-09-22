import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Workspace, WorkspaceSchema } from './schemas/workspace.schema';
import { Invite, InviteSchema } from './schemas/invite.schema';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { MembershipGuard } from '../../common/guards/membership.guard';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    MongooseModule.forFeature([
      { name: Workspace.name, schema: WorkspaceSchema },
      { name: Invite.name, schema: InviteSchema },
    ]),
  ],
  controllers: [WorkspacesController],
  providers: [WorkspacesService, MembershipGuard],
  exports: [WorkspacesService, MongooseModule, MembershipGuard],
})
export class WorkspacesModule {}
