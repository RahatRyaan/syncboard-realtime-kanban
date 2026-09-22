import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Comment, CommentSchema } from './schemas/comment.schema';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { CardsModule } from '../cards/cards.module';
import { UsersModule } from '../users/users.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    CardsModule,
    UsersModule,
    RealtimeModule,
    AuthModule,
    MongooseModule.forFeature([
      { name: Comment.name, schema: CommentSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService, MongooseModule],
})
export class CommentsModule {}
