import { Application } from 'express';
import { createApp } from '../../../src/server';
import { AuthService } from '../../../src/api/auth/auth.service';
import { AuthRepository } from '../../../src/api/auth/auth.repository';
import { RedisClientType } from 'redis';

export interface TestAppSetup {
  app: Application;
  authService: AuthService;
  authRepository: AuthRepository;
}

export const createTestApp = (redisClient: RedisClientType): TestAppSetup => {
  const authRepository = new AuthRepository(redisClient);
  const authService = new AuthService(authRepository);
  const app = createApp({ authService });

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
  const bcrypt = require('bcrypt');
  const passwordHash = await bcrypt.hash(userToCreate.password, 12);

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
