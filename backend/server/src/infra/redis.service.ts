import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis, { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis;

  constructor(private cfg: ConfigService) {
    const url = this.cfg.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this.client = new IORedis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
    });
  }

  async onModuleDestroy() {
    try {
      await this.client.quit();
    } catch {
      // ignore
    }
  }

  /** Define valor com TTL em segundos (se informado). */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  /** Lê valor (ou null). */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /** Remove a chave. */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
