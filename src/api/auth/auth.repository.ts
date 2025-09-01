import { User, StoredUser } from './auth.model';
import { v4 as uuidv4 } from 'uuid';

interface RedisClient {
  multi(): RedisMulti;
  exists(key: string): Promise<number>;
  hGetAll(key: string): Promise<Record<string, string>>;
  get(key: string): Promise<string | null>;
}

interface RedisMulti {
  hSet(key: string, mapping: Record<string, string>): RedisMulti;
  set(key: string, value: string): RedisMulti;
  exec(): Promise<unknown[]>;
}

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
    userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
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

    return this.findById(userId);
  }

  public async findById(id: string): Promise<User | null> {
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
}
