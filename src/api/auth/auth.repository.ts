import { User, RedisUser } from './auth.model';
import { v4 as uuidv4 } from 'uuid';
import { RedisClient } from '../../infra/redis/client';

export interface IAuthRepository {
  createUser(username: string, passwordHash: string): Promise<User>;
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  userExists(username: string): Promise<boolean>;
}

export class AuthRepository implements IAuthRepository {
  private readonly USER_KEY_PREFIX = 'user:';
  private readonly USERNAME_INDEX_PREFIX = 'username:';

  constructor(private readonly redisClient: RedisClient) {}

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

  public async createUser(
    username: string,
    passwordHash: string
  ): Promise<User> {
    const id = uuidv4();
    const now = new Date();

    const user: User = {
      id,
      username,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    const redisUser = this.toRedisUser(user);

    await this.redisClient
      .multi()
      .hSet(this.getUserKey(id), this.serializeForRedis(redisUser))
      .set(this.getUsernameIndexKey(username), id)
      .exec();

    return user;
  }

  public async findByUsername(username: string): Promise<User | null> {
    const userId = await this.redisClient.get(
      this.getUsernameIndexKey(username)
    );
    if (!userId) {
      return null;
    }

    return this._getUserById(userId);
  }

  public async findById(id: string): Promise<User | null> {
    return this._getUserById(id);
  }

  public async userExists(username: string): Promise<boolean> {
    const userId = await this.redisClient.get(
      this.getUsernameIndexKey(username)
    );
    return userId !== null;
  }

  private getUserKey(id: string): string {
    return `${this.USER_KEY_PREFIX}${id}`;
  }

  private getUsernameIndexKey(username: string): string {
    return `${this.USERNAME_INDEX_PREFIX}${username}`;
  }

  private async _getUserById(id: string): Promise<User | null> {
    const redisUser = await this.redisClient.hGetAll(this.getUserKey(id));

    if (!redisUser || Object.keys(redisUser).length === 0) {
      return null;
    }

    return this.fromRedisUser(this.deserializeFromRedis(redisUser));
  }
}
