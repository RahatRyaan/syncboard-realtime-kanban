import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { Response, Request } from 'express';
import { UsersService } from '../users/users.service';
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';
import { RegisterDto, LoginDto, User } from '@syncboard/shared-types';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateTokenString(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private setRefreshCookie(res: Response, token: string) {
    const isProd = this.configService.get<string>('nodeEnv') === 'production';
    res.cookie('sb_refresh', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  private clearRefreshCookie(res: Response) {
    const isProd = this.configService.get<string>('nodeEnv') === 'production';
    res.clearCookie('sb_refresh', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/api/v1/auth',
    });
  }

  async register(dto: RegisterDto, res: Response) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await argon2.hash(dto.password);
    const userDoc = await this.usersService.create({
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
    });

    const userJson = userDoc.toJSON() as unknown as User;
    const accessToken = await this.generateAccessToken(userJson);

    // Create initial refresh session
    const rawRefreshToken = this.generateTokenString();
    const familyId = crypto.randomUUID();
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.refreshTokenModel.create({
      userId: userDoc.id,
      tokenHash,
      familyId,
      expiresAt,
    });

    this.setRefreshCookie(res, rawRefreshToken);

    return {
      user: userJson,
      accessToken,
      expiresIn: 900,
      tokenType: 'Bearer' as const,
      refreshToken: rawRefreshToken, // returned for non-cookie / API clients
    };
  }

  async login(dto: LoginDto, res: Response) {
    const userDoc = await this.usersService.findByEmail(dto.email);
    if (!userDoc) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await argon2.verify(userDoc.password, dto.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const userJson = userDoc.toJSON() as unknown as User;
    const accessToken = await this.generateAccessToken(userJson);

    // Create new refresh session family
    const rawRefreshToken = this.generateTokenString();
    const familyId = crypto.randomUUID();
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.refreshTokenModel.create({
      userId: userDoc.id,
      tokenHash,
      familyId,
      expiresAt,
    });

    this.setRefreshCookie(res, rawRefreshToken);

    return {
      user: userJson,
      accessToken,
      expiresIn: 900,
      tokenType: 'Bearer' as const,
      refreshToken: rawRefreshToken,
    };
  }

  async refresh(req: Request, bodyRefreshToken: string | undefined, res: Response) {
    const token = req.cookies?.sb_refresh || bodyRefreshToken;
    if (!token) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const tokenHash = this.hashToken(token);
    const session = await this.refreshTokenModel.findOne({ tokenHash });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Reuse detection
    if (session.isRevoked) {
      // Invalidate entire family!
      await this.refreshTokenModel.updateMany(
        { familyId: session.familyId },
        { isRevoked: true },
      );
      this.clearRefreshCookie(res);
      throw new UnauthorizedException('Refresh token reuse detected. Session revoked.');
    }

    if (session.expiresAt < new Date()) {
      this.clearRefreshCookie(res);
      throw new UnauthorizedException('Refresh token expired');
    }

    // Invalidate current token
    session.isRevoked = true;
    await session.save();

    // Find user
    const userDoc = await this.usersService.findById(session.userId);
    if (!userDoc) {
      throw new UnauthorizedException('User not found');
    }

    // Rotate new token in same family
    const newRawRefreshToken = this.generateTokenString();
    const newTokenHash = this.hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.refreshTokenModel.create({
      userId: userDoc.id,
      tokenHash: newTokenHash,
      familyId: session.familyId,
      expiresAt: newExpiresAt,
    });

    const userJson = userDoc.toJSON() as unknown as User;
    const accessToken = await this.generateAccessToken(userJson);

    this.setRefreshCookie(res, newRawRefreshToken);

    return {
      accessToken,
      expiresIn: 900,
      tokenType: 'Bearer' as const,
      refreshToken: newRawRefreshToken,
    };
  }

  async logout(req: Request, bodyRefreshToken: string | undefined, res: Response) {
    const token = req.cookies?.sb_refresh || bodyRefreshToken;
    if (token) {
      const tokenHash = this.hashToken(token);
      await this.refreshTokenModel.updateOne(
        { tokenHash },
        { isRevoked: true },
      );
    }

    this.clearRefreshCookie(res);
    return { message: 'Logged out successfully' };
  }

  async getProfile(userId: string): Promise<User> {
    const userDoc = await this.usersService.findById(userId);
    if (!userDoc) {
      throw new NotFoundException('User not found');
    }
    return userDoc.toJSON() as unknown as User;
  }

  private async generateAccessToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };
    return this.jwtService.signAsync(payload);
  }
}
