import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  constructor(private readonly cfg: ConfigService) {
    const rawHost = (this.cfg.get<string>('REDIS_HOST') || '').trim();
    let host = rawHost || 'redis';
    if (host === '127.0.0.1' || host === 'localhost') host = 'redis';

    const port = Number(this.cfg.get<string>('REDIS_PORT') || 6379);
    const password = this.cfg.get<string>('REDIS_PASSWORD') || undefined;
    const db = Number(this.cfg.get<string>('REDIS_DB') || 0);

    const rawUrl = (this.cfg.get<string>('REDIS_URL') || '').trim();
    const useUrl = rawUrl && !/127\.0\.0\.1|localhost/i.test(rawUrl);

    const base: RedisOptions = {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => Math.min(times * 500, 2000),
    };

    this.client = useUrl
      ? new Redis(rawUrl, base)
      : new Redis({ host, port, password, db, ...base });

    const target = useUrl ? rawUrl : `${host}:${port}/${db}`;
    this.client.on('connect', () =>
      this.logger.log(`Connected to Redis at ${target}`),
    );
    this.client.on('error', (err) =>
      this.logger.error(`Redis error: ${err?.message || err}`),
    );
  }

  async onModuleInit() {
    try {
      await this.client.connect();
    } catch (err: any) {
      this.logger.error(`Failed to connect to Redis: ${err?.message || err}`);
    }
  }

  async onModuleDestroy() {
    try {
      await this.client.quit();
    } catch {}
  }

  getClient(): Redis {
    return this.client;
  }

  // TTL em segundos
  async set(
    key: string,
    value: string | number,
    ttlSeconds?: number,
  ): Promise<'OK' | null> {
    const val = String(value);
    if (ttlSeconds && ttlSeconds > 0)
      return this.client.set(key, val, 'EX', ttlSeconds);
    return this.client.set(key, val);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string | string[]): Promise<number> {
    if (Array.isArray(key)) return this.client.del(...key);
    return this.client.del(key);
  }
}
