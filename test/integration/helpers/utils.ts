import { Application } from 'express';
import { createApp } from '../../../src/server';
import { AuthService } from '../../../src/api/auth/auth.service';
import { AuthController } from '../../../src/api/auth/auth.controller';
import { AuthRepository } from '../../../src/api/auth/auth.repository';
import { BcryptStrategy } from '../../../src/api/auth/strategies/BcryptStrategy';
import { RedisClientType } from 'redis';
import { RedisClient } from '../../../src/infra/redis/client';
import { User, RedisUser } from '../../../src/api/auth/auth.model';

class RedisClientAdapter implements RedisClient {
  constructor(private rawClient: RedisClientType) {}

  async connect(): Promise<void> {
    await this.rawClient.connect();
  }

  async disconnect(): Promise<void> {
    await this.rawClient.disconnect();
  }

  async quit(): Promise<void> {
    await this.rawClient.quit();
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

  async saveUser(key: string, user: User): Promise<User> {
    const redisUser = this.toRedisUser(user);
    const serialized = this.serializeForRedis(redisUser);

    await this.rawClient.hSet(key, serialized);
    return user;
  }

  async getUserByKey(key: string): Promise<User | null> {
    const redisUser = await this.rawClient.hGetAll(key);

    if (!redisUser || Object.keys(redisUser).length === 0) {
      return null;
    }

    return this.fromRedisUser(this.deserializeFromRedis(redisUser));
  }

  async saveUserWithIndex(
    userKey: string,
    indexKey: string,
    user: User
  ): Promise<User> {
    const redisUser = this.toRedisUser(user);
    const serialized = this.serializeForRedis(redisUser);

    const results = await this.rawClient
      .multi()
      .hSet(userKey, serialized)
      .set(indexKey, user.id)
      .exec();

    if (!results) {
      throw new Error('User save transaction failed');
    }

    return user;
  }

  async saveUserWithUniqueIndex(
    userKey: string,
    indexKey: string,
    user: User
  ): Promise<{ success: boolean; user?: User }> {
    const redisUser = this.toRedisUser(user);
    const serialized = this.serializeForRedis(redisUser);

    const results = await this.rawClient
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

  async getUserIdByIndex(indexKey: string): Promise<string | null> {
    return await this.rawClient.get(indexKey);
  }
}

export interface TestAppSetup {
  app: Application;
  authService: AuthService;
  authRepository: AuthRepository;
}

export const createTestApp = (redisClient: RedisClientType): TestAppSetup => {
  const redisAdapter = new RedisClientAdapter(redisClient);
  const authRepository = new AuthRepository(redisAdapter);
  const passwordStrategy = new BcryptStrategy(12);
  const authService = new AuthService(authRepository, passwordStrategy);
  const authController = new AuthController(authService);
  const app = createApp({ authController });

  return {
    app,
    authService,
    authRepository,
  };
};

export const createTestUser = async (
  authRepository: AuthRepository,
  userData?: { username?: string; password?: string }
) => {
  const defaultUserData = {
    username: 'testuser',
    password: 'testpassword123',
  };

  const userToCreate = { ...defaultUserData, ...userData };

  // Create user with hashed password
  const { config } = require('../../../src/config');
  const passwordStrategy = new BcryptStrategy(config.saltRounds);
  const passwordHash = await passwordStrategy.hash(userToCreate.password);

  const user = await authRepository.createUser(
    userToCreate.username,
    passwordHash
  );

  return {
    ...user,
    plainPassword: userToCreate.password,
  };
};

export const waitForCondition = async (
  condition: () => Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<boolean> => {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return false;
};
