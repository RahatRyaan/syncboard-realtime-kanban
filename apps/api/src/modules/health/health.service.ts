import { Injectable, HttpStatus, HttpException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface ServiceHealthStatus {
  status: 'healthy' | 'unhealthy';
  responseTimeMs?: number;
  error?: string;
}

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptimeSeconds: number;
  memoryUsageMb: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  };
  services: {
    mongodb: ServiceHealthStatus;
    redis: ServiceHealthStatus;
  };
}

@Injectable()
export class HealthService {
  private redisClient: Redis | null = null;

  constructor(
    @InjectConnection() private readonly mongoConnection: Connection,
    private readonly configService: ConfigService,
  ) {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password = this.configService.get<string | undefined>('redis.password');

    try {
      this.redisClient = new Redis({
        host,
        port,
        password,
        lazyConnect: true,
        connectTimeout: 3000,
        maxRetriesPerRequest: 1,
      });
    } catch {
      this.redisClient = null;
    }
  }

  async checkHealth(): Promise<HealthCheckResult> {
    const startMongo = Date.now();
    let mongoStatus: ServiceHealthStatus = { status: 'healthy' };

    try {
      if (this.mongoConnection.readyState === 1 && this.mongoConnection.db) {
        await this.mongoConnection.db.admin().ping();
        mongoStatus = {
          status: 'healthy',
          responseTimeMs: Date.now() - startMongo,
        };
      } else {
        mongoStatus = {
          status: 'unhealthy',
          error: `Mongoose readyState: ${this.mongoConnection.readyState}`,
        };
      }
    } catch (err: any) {
      mongoStatus = {
        status: 'unhealthy',
        error: err.message || 'MongoDB connection check failed',
      };
    }

    const startRedis = Date.now();
    let redisStatus: ServiceHealthStatus = { status: 'healthy' };

    try {
      if (this.redisClient) {
        if (this.redisClient.status !== 'ready' && this.redisClient.status !== 'connecting') {
          await this.redisClient.connect().catch(() => {});
        }
        const pong = await this.redisClient.ping();
        if (pong === 'PONG') {
          redisStatus = {
            status: 'healthy',
            responseTimeMs: Date.now() - startRedis,
          };
        } else {
          redisStatus = {
            status: 'unhealthy',
            error: `Unexpected ping response: ${pong}`,
          };
        }
      } else {
        redisStatus = {
          status: 'unhealthy',
          error: 'Redis client not initialized',
        };
      }
    } catch (err: any) {
      redisStatus = {
        status: 'unhealthy',
        error: err.message || 'Redis ping failed',
      };
    }

    const isAllHealthy =
      mongoStatus.status === 'healthy' && redisStatus.status === 'healthy';

    const memory = process.memoryUsage();

    const result: HealthCheckResult = {
      status: isAllHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMb: {
        rss: Math.round(memory.rss / (1024 * 1024)),
        heapTotal: Math.round(memory.heapTotal / (1024 * 1024)),
        heapUsed: Math.round(memory.heapUsed / (1024 * 1024)),
      },
      services: {
        mongodb: mongoStatus,
        redis: redisStatus,
      },
    };

    if (!isAllHealthy) {
      throw new HttpException(result, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return result;
  }
}
