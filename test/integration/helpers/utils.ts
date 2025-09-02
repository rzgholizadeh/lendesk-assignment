import { Application } from 'express';
import { createApp } from '../../../src/server';
import { AuthService } from '../../../src/api/auth/auth.service';
import { AuthRepository } from '../../../src/api/auth/auth.repository';
import { RedisClientType } from 'redis';
import { createUserRepository } from '../../../src/infra/redis-om/repository/user.repository';

export interface TestAppSetup {
  app: Application;
  authService: AuthService;
  authRepository: AuthRepository;
}

export const createTestApp = async (redisClient: RedisClientType): Promise<TestAppSetup> => {
  const userRepository = createUserRepository(redisClient);
  
  // Try to create search index for Redis OM (might fail on basic Redis)
  try {
    await userRepository.createIndex();
  } catch (error) {
    console.log('Warning: Could not create search index, search functionality may not work');
  }
  
  const authRepository = new AuthRepository(userRepository);
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
