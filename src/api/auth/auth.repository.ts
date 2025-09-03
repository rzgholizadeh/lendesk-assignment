import { User, StoredUser } from './auth.model';
import { v4 as uuidv4 } from 'uuid';
import { RedisClient } from '../../infra/redis/client';

export interface IAuthRepository {
  createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  userExists(username: string): Promise<boolean>;
}

export class AuthRepository implements IAuthRepository {
  private readonly USER_KEY_PREFIX = 'user:';
  private readonly USERNAME_INDEX_PREFIX = 'username:';

  constructor(private readonly redisClient: RedisClient) {}

  public async createUser(
    userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> // NOTE: the input here should be pure User model. Not a complex type.
  ): Promise<User> {
    const id = uuidv4();
    const now = new Date();

    const user: User = {
      id,
      username: userData.username,
      passwordHash: userData.passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    const storedUser: StoredUser = {
      ...user,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await this.redisClient
      .multi()
      .hSet(
        this.getUserKey(id),
        storedUser as unknown as Record<string, string>
      )
      .set(this.getUsernameIndexKey(userData.username), id)
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
    const storedUser = await this.redisClient.hGetAll(this.getUserKey(id));

    if (!storedUser || Object.keys(storedUser).length === 0) {
      return null;
    }

    return {
      id: storedUser.id,
      username: storedUser.username,
      passwordHash: storedUser.passwordHash,
      createdAt: new Date(storedUser.createdAt),
      updatedAt: new Date(storedUser.updatedAt),
    };
  }
}
