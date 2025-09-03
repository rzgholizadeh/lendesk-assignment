import request from 'supertest';
import { Application } from 'express';
import { createTestApp, createTestUser, TestAppSetup } from './helpers/utils';
import { StartedRedisContainer } from '@testcontainers/redis';

// Type assertion to match the global setup
const globalWithRedis = global as typeof globalThis & {
  redisContainer: StartedRedisContainer;
  redisClient: import('redis').RedisClientType;
};

describe('Server Integration Tests', () => {
  let testSetup: TestAppSetup;
  let app: Application;

  beforeEach(() => {
    testSetup = createTestApp(globalWithRedis.redisClient);
    app = testSetup.app;
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
    });
  });

  describe('Authentication Endpoints - Full Integration', () => {
    describe('User Registration', () => {
      it('should register a new user successfully', async () => {
        const userData = {
          username: 'newuser',
          password: 'securepassword123',
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData)
          .expect(201);

        expect(response.body).toHaveProperty('ok', true);
        expect(response.body).toHaveProperty('user');
        expect(response.body.user).toHaveProperty('userId');
        expect(response.body.user).toHaveProperty(
          'username',
          userData.username
        );
        expect(typeof response.body.user.userId).toBe('string');

        // Verify user was actually stored in Redis
        const storedUser = await testSetup.authRepository.findByUsername(
          userData.username
        );
        expect(storedUser).toBeTruthy();
        expect(storedUser!.username).toBe(userData.username);
        expect(storedUser!.id).toBe(response.body.user.userId);
      });

      it('should reject duplicate username registration', async () => {
        const userData = {
          username: 'duplicateuser',
          password: 'password123',
        };

        // Register first user
        await request(app)
          .post('/api/v1/auth/register')
          .send(userData)
          .expect(201);

        // Attempt to register same username again
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData)
          .expect(409);

        expect(response.body).toHaveProperty(
          'message',
          'Username already exists'
        );
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({ username: 'onlyusername' })
          .expect(400);

        expect(response.body).toHaveProperty('message', 'Validation failed');
      });

      it('should enforce minimum password length', async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            username: 'testuser',
            password: '123', // Too short
          })
          .expect(400);

        expect(response.body).toHaveProperty('message', 'Validation failed');
      });
    });

    describe('User Login', () => {
      let existingUser: {
        id: string;
        username: string;
        passwordHash: string;
        createdAt: Date;
        updatedAt: Date;
        plainPassword: string;
      };

      beforeEach(async () => {
        existingUser = await createTestUser(testSetup.authRepository, {
          username: 'loginuser',
          password: 'correctpassword123',
        });
      });

      it('should login with correct credentials', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            username: existingUser.username,
            password: existingUser.plainPassword,
          })
          .expect(200);

        expect(response.body).toHaveProperty('ok', true);
        expect(response.body).toHaveProperty('user');
        expect(response.body.user).toHaveProperty('userId', existingUser.id);
        expect(response.body.user).toHaveProperty(
          'username',
          existingUser.username
        );
      });

      it('should reject incorrect password', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            username: existingUser.username,
            password: 'wrongpassword',
          })
          .expect(401);

        expect(response.body).toHaveProperty('message', 'Invalid credentials');
      });

      it('should reject non-existent username', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            username: 'nonexistentuser',
            password: 'somepassword',
          })
          .expect(401);

        expect(response.body).toHaveProperty('message', 'Invalid credentials');
      });

      it('should validate required login fields', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({ username: 'onlyusername' })
          .expect(400);

        expect(response.body).toHaveProperty('message', 'Validation failed');
      });
    });

    describe('Full User Flow', () => {
      it('should complete register -> login workflow', async () => {
        const userData = {
          username: 'flowuser',
          password: 'flowpassword123',
        };

        // Step 1: Register user
        const registerResponse = await request(app)
          .post('/api/v1/auth/register')
          .send(userData)
          .expect(201);

        const userId = registerResponse.body.user.userId;

        // Step 2: Login with same credentials
        const loginResponse = await request(app)
          .post('/api/v1/auth/login')
          .send(userData)
          .expect(200);

        expect(loginResponse.body.user.userId).toBe(userId);
        expect(loginResponse.body.ok).toBe(true);

        // Step 3: Verify user persists in Redis
        const storedUser = await testSetup.authRepository.findById(userId);
        expect(storedUser).toBeTruthy();
        expect(storedUser!.username).toBe(userData.username);
      });
    });
  });

  describe('Redis Integration', () => {
    it('should persist user data across requests', async () => {
      const userData = {
        username: 'persistentuser',
        password: 'persistent123',
      };

      // Register user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      // Verify data exists in Redis directly
      const userKey = `user:${registerResponse.body.user.userId}`;
      const usernameKey = `username:${userData.username}`;

      const userData_redis = await globalWithRedis.redisClient.hGetAll(userKey);
      const usernameMapping =
        await globalWithRedis.redisClient.get(usernameKey);

      expect(userData_redis).toBeTruthy();
      expect(userData_redis.username).toBe(userData.username);
      expect(usernameMapping).toBe(registerResponse.body.user.userId);
    });

    it('should handle Redis connection gracefully', async () => {
      // This test verifies the application responds appropriately when Redis is available
      expect(globalWithRedis.redisClient.isOpen).toBe(true);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'redisuser',
          password: 'redispassword123',
        })
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('userId');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent endpoints', async () => {
      await request(app).get('/api/v1/nonexistent').expect(404);
    });

    it('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Validation failed');
    });
  });
});
