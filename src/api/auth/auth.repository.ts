import { User } from './auth.model';
import { v4 as uuidv4 } from 'uuid';
import { RedisClient } from '../../infra/redis/client';
import { DuplicateKeyError } from './auth.errors';

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

    const result = await this.redisClient.saveUserWithUniqueIndex(
      this.getUserKey(id),
      this.getUsernameIndexKey(username),
      user
    );

    if (!result.success) {
      throw new DuplicateKeyError(
        `username:${username}`,
        'Username already exists'
      );
    }

    return result.user!;
  }

  public async findByUsername(username: string): Promise<User | null> {
    const userId = await this.redisClient.getUserIdByIndex(
      this.getUsernameIndexKey(username)
    );
    if (!userId) {
      return null;
    }

    return await this.redisClient.getUserByKey(this.getUserKey(userId));
  }

  public async findById(id: string): Promise<User | null> {
    return await this.redisClient.getUserByKey(this.getUserKey(id));
  }

  public async userExists(username: string): Promise<boolean> {
    const userId = await this.redisClient.getUserIdByIndex(
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
}
