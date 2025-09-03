import { createClient, RedisClientType } from 'redis';
import { logger } from '../../common/logger/logger';
import { User, RedisUser } from '../../api/auth/auth.model';

export interface RedisClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  quit(): Promise<void>;
  saveUser(key: string, user: User): Promise<User>;
  getUserByKey(key: string): Promise<User | null>;
  saveUserWithIndex(
    userKey: string,
    indexKey: string,
    user: User
  ): Promise<User>;
  saveUserWithUniqueIndex(
    userKey: string,
    indexKey: string,
    user: User
  ): Promise<{ success: boolean; user?: User }>;
  getUserIdByIndex(indexKey: string): Promise<string | null>;
}

export class RedisClientService implements RedisClient {
  private client: RedisClientType;

  constructor(url: string) {
    this.client = createClient({
      url,
    });
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info('Connected to Redis successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('Failed to connect to Redis:', {
        error: errorMessage,
      });
      throw new Error(`Redis connection failed: ${errorMessage}`);
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      logger.info('Disconnected from Redis successfully');
    } catch (error) {
      logger.error('Failed to disconnect from Redis:', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  public async quit(): Promise<void> {
    try {
      await this.client.quit();
      logger.info('Redis client quit successfully');
    } catch (error) {
      logger.error('Failed to quit Redis client:', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private toRedisUser(user: User): RedisUser {
    return {
      id: user.id,
      username: user.username,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private fromRedisUser(redisUser: RedisUser): User {
    return {
      id: redisUser.id,
      username: redisUser.username,
      passwordHash: redisUser.passwordHash,
      createdAt: new Date(redisUser.createdAt),
      updatedAt: new Date(redisUser.updatedAt),
    };
  }

  private serializeForRedis(redisUser: RedisUser): Record<string, string> {
    return {
      id: redisUser.id,
      username: redisUser.username,
      passwordHash: redisUser.passwordHash,
      createdAt: redisUser.createdAt,
      updatedAt: redisUser.updatedAt,
    };
  }

  private deserializeFromRedis(data: Record<string, string>): RedisUser {
    return {
      id: data.id,
      username: data.username,
      passwordHash: data.passwordHash,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  public async saveUser(key: string, user: User): Promise<User> {
    const redisUser = this.toRedisUser(user);
    const serialized = this.serializeForRedis(redisUser);

    await this.client.hSet(key, serialized);
    return user;
  }

  public async getUserByKey(key: string): Promise<User | null> {
    const redisUser = await this.client.hGetAll(key);

    if (!redisUser || Object.keys(redisUser).length === 0) {
      return null;
    }

    return this.fromRedisUser(this.deserializeFromRedis(redisUser));
  }

  public async saveUserWithIndex(
    userKey: string,
    indexKey: string,
    user: User
  ): Promise<User> {
    const redisUser = this.toRedisUser(user);
    const serialized = this.serializeForRedis(redisUser);

    const results = await this.client
      .multi()
      .hSet(userKey, serialized)
      .set(indexKey, user.id)
      .exec();

    if (!results) {
      throw new Error('User save transaction failed');
    }

    return user;
  }

  public async saveUserWithUniqueIndex(
    userKey: string,
    indexKey: string,
    user: User
  ): Promise<{ success: boolean; user?: User }> {
    const redisUser = this.toRedisUser(user);
    const serialized = this.serializeForRedis(redisUser);

    const results = await this.client
      .multi()
      .setNX(indexKey, user.id)
      .hSet(userKey, serialized)
      .exec();

    // Check if username index was created (setNX succeeded)
    // Redis setNX returns 1 for success, 0 for failure
    const uniquenessSuccess = !!(
      results &&
      results.length > 0 &&
      results[0] &&
      Array.isArray(results[0]) &&
      results[0][1] === 1
    );

    return {
      success: uniquenessSuccess,
      user: uniquenessSuccess ? user : undefined,
    };
  }

  public async getUserIdByIndex(indexKey: string): Promise<string | null> {
    return await this.client.get(indexKey);
  }
}
