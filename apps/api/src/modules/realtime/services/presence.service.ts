import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class PresenceService {
  private readonly TTL = 30;

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async addUser(boardId: string, userId: string): Promise<void> {
    const key = `board:${boardId}:online`;
    const users = ((await this.cacheManager.get(key)) as string[]) || [];
    if (!users.includes(userId)) {
      users.push(userId);
      await this.cacheManager.set(key, users, this.TTL * 1000);
    }
  }

  async removeUserFromBoard(boardId: string, userId: string): Promise<void> {
    const key = `board:${boardId}:online`;
    const users = ((await this.cacheManager.get(key)) as string[]) || [];
    const filtered = users.filter((u: string) => u !== userId);
    if (filtered.length > 0) {
      await this.cacheManager.set(key, filtered, this.TTL * 1000);
    } else {
      await this.cacheManager.del(key);
    }
  }

  async removeUser(userId: string): Promise<void> {
    const pattern = `board:*:online`;
    const keys = await this.getAllKeys(pattern);
    for (const key of keys) {
      const users = ((await this.cacheManager.get(key)) as string[]) || [];
      const filtered = users.filter((u: string) => u !== userId);
      if (filtered.length > 0) {
        await this.cacheManager.set(key, filtered, this.TTL * 1000);
      } else {
        await this.cacheManager.del(key);
      }
    }
  }

  async getOnlineUsers(boardId: string): Promise<string[]> {
    const key = `board:${boardId}:online`;
    return ((await this.cacheManager.get(key)) as string[]) || [];
  }

  async refreshUserTTL(boardId: string, userId: string): Promise<void> {
    const key = `board:${boardId}:online`;
    const users = ((await this.cacheManager.get(key)) as string[]) || [];
    if (users.includes(userId)) {
      await this.cacheManager.set(key, users, this.TTL * 1000);
    }
  }

  private async getAllKeys(pattern: string): Promise<string[]> {
    try {
      const stores = (this.cacheManager as any).stores;
      if (stores && stores.length > 0) {
        const store = stores[0];
        if (store.keys) {
          return (await store.keys()) as string[];
        }
      }
    } catch (error) {
      return [];
    }
    return [];
  }
}
