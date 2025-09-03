import { Application } from 'express';
import { createApp } from '../../../src/server';
import { AuthService } from '../../../src/api/auth/auth.service';
import { AuthController } from '../../../src/api/auth/auth.controller';
import { AuthRepository } from '../../../src/api/auth/auth.repository';
import { BcryptStrategy } from '../../../src/api/auth/strategies/BcryptStrategy';
import { RedisClientType } from 'redis';
import { RedisClient, RedisMulti } from '../../../src/infra/redis/client';

class RedisClientAdapter implements RedisClient {
  constructor(private rawClient: RedisClientType) {}

  multi(): RedisMulti {
    return this.rawClient.multi() as RedisMulti;
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    return this.rawClient.hGetAll(key);
  }

  async get(key: string): Promise<string | null> {
    return this.rawClient.get(key);
  }

  async connect(): Promise<void> {
    await this.rawClient.connect();
  }

  async disconnect(): Promise<void> {
    await this.rawClient.disconnect();
  }

  async quit(): Promise<void> {
    await this.rawClient.quit();
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

  const user = await authRepository.createUser({
    username: userToCreate.username,
    passwordHash,
  });

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
