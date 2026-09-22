import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CardsService } from '../cards/cards.service';
import { RealtimeGateway } from '../realtime/gateways/realtime.gateway';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name)
    private readonly commentModel: Model<CommentDocument>,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly cardsService: CardsService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async findByCard(cardId: string, userId: string): Promise<CommentDocument[]> {
    await this.cardsService.findOne(cardId, userId);

    return this.commentModel
      .find({ cardId })
      .populate('userId', 'name email avatarUrl')
      .populate('mentions', 'name email')
      .sort({ createdAt: 1 })
      .exec();
  }

  async create(userId: string, dto: CreateCommentDto): Promise<CommentDocument> {
    const card = await this.cardsService.findOne(dto.cardId, userId);
    const author = await this.userModel.findById(userId).exec();

    const mentionTokens = this.extractMentions(dto.content);
    let mentionUserIds: string[] = [];

    if (mentionTokens.length > 0) {
      const regexPatterns = mentionTokens.map((t) => new RegExp(`^${t}$`, 'i'));
      const mentionedUsers = await this.userModel
        .find({
          $or: [
            { name: { $in: regexPatterns } },
            { email: { $in: regexPatterns } },
          ],
        })
        .exec();

      mentionUserIds = mentionedUsers
        .map((u) => u._id.toString())
        .filter((id) => id !== userId);
    }

    const comment = new this.commentModel({
      cardId: dto.cardId,
      userId,
      content: dto.content,
      mentions: mentionUserIds,
    });

    const savedComment = await comment.save();
    const populated = await this.commentModel
      .findById(savedComment._id)
      .populate('userId', 'name email avatarUrl')
      .populate('mentions', 'name email')
      .exec();

    const authorName = author?.name || 'Someone';

    for (const recipientId of mentionUserIds) {
      const notification = new this.notificationModel({
        recipientId,
        senderId: userId,
        type: 'mention',
        boardId: card.boardId,
        cardId: card.id,
        commentId: savedComment._id.toString(),
        content: `${authorName} mentioned you in a comment on "${card.title}"`,
        read: false,
      });

      const savedNotification = await notification.save();
      const populatedNotif = await this.notificationModel
        .findById(savedNotification._id)
        .populate('senderId', 'name email')
        .exec();

      const notifData =
        typeof populatedNotif?.toJSON === 'function'
          ? populatedNotif.toJSON()
          : typeof savedNotification?.toJSON === 'function'
            ? savedNotification.toJSON()
            : populatedNotif || savedNotification;

      this.realtimeGateway.emitToUser(recipientId, 'notification:new', notifData);
    }

    const commentJson =
      typeof populated?.toJSON === 'function'
        ? populated.toJSON()
        : typeof savedComment?.toJSON === 'function'
          ? savedComment.toJSON()
          : populated || savedComment;

    this.realtimeGateway.emitToBoard(
      card.boardId.toString(),
      'comment:created',
      commentJson,
    );
    this.realtimeGateway.emitToCard(
      card.id,
      'comment:created',
      commentJson,
    );

    return populated || savedComment;
  }

  async update(
    commentId: string,
    userId: string,
    dto: UpdateCommentDto,
  ): Promise<CommentDocument> {
    const comment = await this.commentModel.findById(commentId).exec();
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId.toString() !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const mentionTokens = this.extractMentions(dto.content);
    let mentionUserIds: string[] = [];

    if (mentionTokens.length > 0) {
      const regexPatterns = mentionTokens.map((t) => new RegExp(`^${t}$`, 'i'));
      const mentionedUsers = await this.userModel
        .find({
          $or: [
            { name: { $in: regexPatterns } },
            { email: { $in: regexPatterns } },
          ],
        })
        .exec();

      mentionUserIds = mentionedUsers
        .map((u) => u._id.toString())
        .filter((id) => id !== userId);
    }

    comment.content = dto.content;
    comment.mentions = mentionUserIds;

    const saved = await comment.save();
    return this.commentModel
      .findById(saved._id)
      .populate('userId', 'name email avatarUrl')
      .populate('mentions', 'name email')
      .exec() as Promise<CommentDocument>;
  }

  async remove(commentId: string, userId: string): Promise<{ success: boolean }> {
    const comment = await this.commentModel.findById(commentId).exec();
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentModel.deleteOne({ _id: commentId }).exec();
    await this.notificationModel.deleteMany({ commentId }).exec();

    return { success: true };
  }

  async getUserNotifications(
    userId: string,
    unreadOnly = false,
  ): Promise<NotificationDocument[]> {
    const query: any = { recipientId: userId };
    if (unreadOnly) {
      query.read = false;
    }

    return this.notificationModel
      .find(query)
      .populate('senderId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }

  async markNotificationAsRead(
    notificationId: string,
    userId: string,
  ): Promise<NotificationDocument> {
    const notification = await this.notificationModel
      .findOneAndUpdate(
        { _id: notificationId, recipientId: userId },
        { $set: { read: true } },
        { new: true },
      )
      .populate('senderId', 'name email')
      .exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async markAllNotificationsAsRead(
    userId: string,
  ): Promise<{ modifiedCount: number }> {
    const result = await this.notificationModel
      .updateMany({ recipientId: userId, read: false }, { $set: { read: true } })
      .exec();

    return { modifiedCount: result.modifiedCount };
  }

  private extractMentions(text: string): string[] {
    const matches = text.match(/@([a-zA-Z0-9._-]+)/g);
    if (!matches) return [];
    return [...new Set(matches.map((m) => m.slice(1).trim()))];
  }
}
