import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as argon2 from 'argon2';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Workspace, WorkspaceDocument } from '../workspaces/schemas/workspace.schema';
import { Board, BoardDocument } from '../boards/schemas/board.schema';
import { Column, ColumnDocument } from '../columns/schemas/column.schema';
import { Card, CardDocument } from '../cards/schemas/card.schema';

const DEMO_WORKSPACE_NAME = 'Acme Product Team';
const DEMO_BOARD_TITLE = 'Q3 Product Roadmap';

interface DemoColumnSpec {
  key: string;
  title: string;
  status: string;
  rank: string;
}

interface DemoCardSpec {
  column: string;
  title: string;
  description: string;
  labels: string[];
  rank: string;
}

const DEMO_COLUMNS: DemoColumnSpec[] = [
  { key: 'backlog', title: 'Backlog', status: 'backlog', rank: 'a0' },
  { key: 'todo', title: 'To Do', status: 'todo', rank: 'a1' },
  { key: 'inprogress', title: 'In Progress', status: 'in-progress', rank: 'a2' },
  { key: 'review', title: 'In Review', status: 'review', rank: 'a3' },
  { key: 'done', title: 'Done', status: 'done', rank: 'a4' },
];

const DEMO_CARDS: DemoCardSpec[] = [
  {
    column: 'backlog',
    title: 'Offline mode for board reads',
    description:
      'Cache the last-fetched board state so users can review tasks without connectivity. Writes stay queued for later sync.',
    labels: ['feature', 'platform'],
    rank: 'a0',
  },
  {
    column: 'todo',
    title: 'Keyboard shortcuts for card navigation',
    description:
      'Let power users move between cards and columns without reaching for the mouse. Needs a discoverable cheat sheet.',
    labels: ['ux'],
    rank: 'a0',
  },
  {
    column: 'todo',
    title: 'Bulk card assignment',
    description:
      'Select multiple cards and reassign them in one action. Should respect existing permission checks per card.',
    labels: ['feature'],
    rank: 'a1',
  },
  {
    column: 'inprogress',
    title: 'Real-time presence indicators',
    description:
      'Show which teammates are currently viewing a board. Presence heartbeats already flow over the socket gateway.',
    labels: ['realtime', 'feature'],
    rank: 'a0',
  },
  {
    column: 'inprogress',
    title: 'Optimistic card reordering',
    description:
      'Apply drag-and-drop reordering locally, then reconcile with the server version to avoid visible snap-back.',
    labels: ['realtime', 'performance'],
    rank: 'a1',
  },
  {
    column: 'review',
    title: 'Document version history UI',
    description:
      'Surface the document version timeline and allow restoring a prior revision. Backend versioning is in place.',
    labels: ['documents'],
    rank: 'a0',
  },
  {
    column: 'done',
    title: 'Argon2 password hashing',
    description:
      'Passwords are hashed with Argon2id at registration and verified on login. No plaintext ever reaches the database.',
    labels: ['security'],
    rank: 'a0',
  },
  {
    column: 'done',
    title: 'Refresh token rotation with reuse detection',
    description:
      'Refresh tokens rotate on every use. Presenting an already-revoked token revokes the whole session family.',
    labels: ['security', 'auth'],
    rank: 'a1',
  },
  {
    column: 'done',
    title: 'Optimistic concurrency on board updates',
    description:
      'Version-checked writes return a typed conflict so clients can reconcile instead of silently clobbering.',
    labels: ['realtime'],
    rank: 'a2',
  },
];

/**
 * Provisions the public demo account and a populated sample board.
 *
 * Gated behind SEED_DEMO_DATA so a production deploy can never silently create
 * a known-credential account. Idempotent: re-running updates the existing demo
 * content rather than duplicating it.
 */
@Injectable()
export class DemoSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DemoSeedService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Workspace.name)
    private readonly workspaceModel: Model<WorkspaceDocument>,
    @InjectModel(Board.name) private readonly boardModel: Model<BoardDocument>,
    @InjectModel(Column.name) private readonly columnModel: Model<ColumnDocument>,
    @InjectModel(Card.name) private readonly cardModel: Model<CardDocument>,
  ) {}

  async onApplicationBootstrap() {
    if (!this.isEnabled()) {
      return;
    }
    try {
      await this.seed();
    } catch (error) {
      this.logger.error(`Demo seed failed: ${(error as Error).message}`);
    }
  }

  private isEnabled(): boolean {
    return process.env.SEED_DEMO_DATA === 'true';
  }

  private get demoEmail(): string {
    return (
      this.configService.get<string>('demo.accountEmail') || 'demo@syncboard.app'
    ).toLowerCase();
  }

  private get demoPassword(): string {
    return this.configService.get<string>('demo.accountPassword') || 'SyncBoard!Demo2026';
  }

  async seed() {
    const email = this.demoEmail;
    const password = this.demoPassword;

    let demoUser = await this.userModel.findOne({ email }).exec();

    if (demoUser) {
      this.logger.log(`Demo user ${email} already exists; refreshing content only.`);
    } else {
      demoUser = await this.userModel.create({
        email,
        password: await argon2.hash(password),
        name: 'Demo Owner',
        jobTitle: 'Head of Product',
        location: 'Remote',
        bio: 'Workspace owner on the SyncBoard demo account. Browse the seeded roadmap board to see columns, cards, and real-time collaboration in action.',
      });
      this.logger.log(`Created demo user ${email}`);
    }

    const demoWorkspace = await this.ensureWorkspace(demoUser.id);
    await this.ensureBoardContent(demoWorkspace.id, demoUser.id);

    this.logger.log(
      `Demo data ready: workspace "${DEMO_WORKSPACE_NAME}" with board "${DEMO_BOARD_TITLE}"`,
    );
    return demoUser;
  }

  private async ensureWorkspace(ownerId: string): Promise<WorkspaceDocument> {
    const existing = await this.workspaceModel
      .findOne({ ownerId, name: DEMO_WORKSPACE_NAME })
      .exec();

    if (existing) {
      // Keep the demo on Pro so the seeded board does not sit at a plan cap.
      if (existing.plan !== 'pro') {
        existing.plan = 'pro';
        await existing.save();
      }
      return existing;
    }

    return this.workspaceModel.create({
      name: DEMO_WORKSPACE_NAME,
      slug: `demo-product-team-${Date.now().toString(36)}`,
      ownerId,
      plan: 'pro',
      members: [{ userId: ownerId, role: 'owner', joinedAt: new Date() }],
    });
  }

  private async ensureBoardContent(workspaceId: string, ownerId: string) {
    let board = await this.boardModel
      .findOne({ workspaceId, title: DEMO_BOARD_TITLE })
      .exec();

    if (!board) {
      board = await this.boardModel.create({
        workspaceId,
        title: DEMO_BOARD_TITLE,
        description:
          'A seeded sample roadmap. Move cards between columns to see optimistic concurrency and real-time presence.',
        version: 1,
      });
    }

    const columnIds = new Map<string, string>();

    for (const spec of DEMO_COLUMNS) {
      let column = await this.columnModel
        .findOne({ boardId: board.id, title: spec.title })
        .exec();

      if (!column) {
        column = await this.columnModel.create({
          boardId: board.id,
          title: spec.title,
          status: spec.status,
          rank: spec.rank,
          version: 1,
        });
      }
      columnIds.set(spec.key, column.id);
    }

    for (const spec of DEMO_CARDS) {
      const columnId = columnIds.get(spec.column);
      if (!columnId) continue;

      const exists = await this.cardModel
        .findOne({ boardId: board.id, columnId, title: spec.title })
        .exec();
      if (exists) continue;

      await this.cardModel.create({
        boardId: board.id,
        columnId,
        title: spec.title,
        description: spec.description,
        labels: spec.labels,
        rank: spec.rank,
        assigneeIds: [ownerId],
        version: 1,
      });
    }
  }
}
