jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

jest.mock('../../../common/logger/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Redis Client', () => {
  let mockRedisClient: jest.Mocked<{
    connect: jest.Mock;
    on: jest.Mock;
    disconnect: jest.Mock;
    quit: jest.Mock;
    multi: jest.Mock;
    hGetAll: jest.Mock;
    get: jest.Mock;
    hSet: jest.Mock;
    setNX: jest.Mock;
  }>;
  let processExitSpy: jest.SpyInstance;
  let mockLogger: { info: jest.Mock; error: jest.Mock; warn: jest.Mock };

  beforeEach(() => {
    jest.resetModules();

    mockRedisClient = {
      connect: jest.fn(),
      on: jest.fn(),
      disconnect: jest.fn(),
      quit: jest.fn(),
      multi: jest.fn(),
      hGetAll: jest.fn(),
      get: jest.fn(),
      hSet: jest.fn(),
      setNX: jest.fn(),
    };

    (require('redis').createClient as jest.Mock).mockReturnValue(
      mockRedisClient
    );

    mockLogger = require('../../../common/logger/logger').logger;
    mockLogger.info.mockClear();
    mockLogger.error.mockClear();
    mockLogger.warn.mockClear();

    processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('RedisClientService', () => {
    let RedisClientService: typeof import('../client').RedisClientService;

    beforeEach(() => {
      const clientModule = require('../client');
      RedisClientService = clientModule.RedisClientService;
    });

    it('should create Redis client with provided URL', () => {
      const testUrl = 'redis://localhost:6379';
      new RedisClientService(testUrl);
      const { createClient } = require('redis');

      expect(createClient).toHaveBeenCalledWith({
        url: testUrl,
      });
    });

    it('should create Redis client with custom URL from constructor', () => {
      const customUrl = 'redis://custom-host:6380';
      new RedisClientService(customUrl);

      const { createClient } = require('redis');
      expect(createClient).toHaveBeenCalledWith({
        url: customUrl,
      });
    });

    it('should connect to Redis successfully', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      const client = new RedisClientService('redis://localhost:6379');

      await client.connect();

      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Connected to Redis successfully'
      );
    });

    it('should log error and throw on connection failure', async () => {
      const error = new Error('Connection failed');
      mockRedisClient.connect.mockRejectedValue(error);
      const client = new RedisClientService('redis://localhost:6379');

      await expect(client.connect()).rejects.toThrow(
        'Redis connection failed: Connection failed'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect to Redis:',
        {
          error: 'Connection failed',
        }
      );
      expect(processExitSpy).not.toHaveBeenCalled();
    });

    it('should handle non-Error objects on connection failure', async () => {
      mockRedisClient.connect.mockRejectedValue('String error');
      const client = new RedisClientService('redis://localhost:6379');

      await expect(client.connect()).rejects.toThrow(
        'Redis connection failed: String error'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect to Redis:',
        {
          error: 'String error',
        }
      );
      expect(processExitSpy).not.toHaveBeenCalled();
    });

    it('should disconnect from Redis successfully', async () => {
      mockRedisClient.disconnect.mockResolvedValue(undefined);
      const client = new RedisClientService('redis://localhost:6379');

      await client.disconnect();

      expect(mockRedisClient.disconnect).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Disconnected from Redis successfully'
      );
    });

    it('should log error on disconnection failure but not exit', async () => {
      const error = new Error('Disconnection failed');
      mockRedisClient.disconnect.mockRejectedValue(error);
      const client = new RedisClientService('redis://localhost:6379');

      await client.disconnect();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to disconnect from Redis:',
        {
          error: 'Disconnection failed',
        }
      );
      expect(processExitSpy).not.toHaveBeenCalled();
    });

    it('should handle non-Error objects on disconnection failure', async () => {
      mockRedisClient.disconnect.mockRejectedValue('String error');
      const client = new RedisClientService('redis://localhost:6379');

      await client.disconnect();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to disconnect from Redis:',
        {
          error: 'String error',
        }
      );
      expect(processExitSpy).not.toHaveBeenCalled();
    });

    it('should quit from Redis successfully', async () => {
      mockRedisClient.quit.mockResolvedValue(undefined);
      const client = new RedisClientService('redis://localhost:6379');

      await client.quit();

      expect(mockRedisClient.quit).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Redis client quit successfully'
      );
    });

    it('should log error on quit failure but not throw', async () => {
      const error = new Error('Quit failed');
      mockRedisClient.quit.mockRejectedValue(error);
      const client = new RedisClientService('redis://localhost:6379');

      await client.quit();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to quit Redis client:',
        {
          error: 'Quit failed',
        }
      );
    });

    it('should save user and return the same user', async () => {
      const user = {
        id: 'test-id',
        username: 'testuser',
        passwordHash: 'hashedpass',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockRedisClient.hSet.mockResolvedValue(1);
      const client = new RedisClientService('redis://localhost:6379');

      const result = await client.saveUser('user:test-id', user);

      expect(mockRedisClient.hSet).toHaveBeenCalledWith('user:test-id', {
        id: 'test-id',
        username: 'testuser',
        passwordHash: 'hashedpass',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
      expect(result).toEqual(user);
    });

    it('should get user by key and return domain model', async () => {
      const redisData = {
        id: 'test-id',
        username: 'testuser',
        passwordHash: 'hashedpass',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockRedisClient.hGetAll.mockResolvedValue(redisData);
      const client = new RedisClientService('redis://localhost:6379');

      const result = await client.getUserByKey('user:test-id');

      expect(mockRedisClient.hGetAll).toHaveBeenCalledWith('user:test-id');
      expect(result).toEqual({
        id: 'test-id',
        username: 'testuser',
        passwordHash: 'hashedpass',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      });
    });

    it('should return null when user not found', async () => {
      mockRedisClient.hGetAll.mockResolvedValue({});
      const client = new RedisClientService('redis://localhost:6379');

      const result = await client.getUserByKey('user:nonexistent');

      expect(result).toBeNull();
    });

    it('should save user with index using transaction', async () => {
      const user = {
        id: 'test-id',
        username: 'testuser',
        passwordHash: 'hashedpass',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const mockMulti = {
        hSet: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([null, null]),
      };

      mockRedisClient.multi.mockReturnValue(mockMulti);
      const client = new RedisClientService('redis://localhost:6379');

      const result = await client.saveUserWithIndex(
        'user:test-id',
        'username:testuser',
        user
      );

      expect(mockMulti.hSet).toHaveBeenCalledWith('user:test-id', {
        id: 'test-id',
        username: 'testuser',
        passwordHash: 'hashedpass',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
      expect(mockMulti.set).toHaveBeenCalledWith(
        'username:testuser',
        'test-id'
      );
      expect(result).toEqual(user);
    });

    it('should throw error when transaction fails', async () => {
      const user = {
        id: 'test-id',
        username: 'testuser',
        passwordHash: 'hashedpass',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const mockMulti = {
        hSet: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };

      mockRedisClient.multi.mockReturnValue(mockMulti);
      const client = new RedisClientService('redis://localhost:6379');

      await expect(
        client.saveUserWithIndex('user:test-id', 'username:testuser', user)
      ).rejects.toThrow('User save transaction failed');
    });

    it('should get user ID by index', async () => {
      mockRedisClient.get.mockResolvedValue('test-id');
      const client = new RedisClientService('redis://localhost:6379');

      const result = await client.getUserIdByIndex('username:testuser');

      expect(mockRedisClient.get).toHaveBeenCalledWith('username:testuser');
      expect(result).toBe('test-id');
    });

    it('should return null when index not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      const client = new RedisClientService('redis://localhost:6379');

      const result = await client.getUserIdByIndex('username:nonexistent');

      expect(result).toBeNull();
    });

    it('should save user with unique index successfully', async () => {
      const user = {
        id: 'test-id',
        username: 'testuser',
        passwordHash: 'hashedpass',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const mockMulti = {
        setNX: jest.fn().mockReturnThis(),
        hSet: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 1],
          [null, 'OK'],
        ]), // setNX succeeded
      };

      mockRedisClient.multi.mockReturnValue(mockMulti);
      const client = new RedisClientService('redis://localhost:6379');

      const result = await client.saveUserWithUniqueIndex(
        'user:test-id',
        'username:testuser',
        user
      );

      expect(mockMulti.setNX).toHaveBeenCalledWith(
        'username:testuser',
        'test-id'
      );
      expect(mockMulti.hSet).toHaveBeenCalledWith('user:test-id', {
        id: 'test-id',
        username: 'testuser',
        passwordHash: 'hashedpass',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
      expect(result.success).toBe(true);
      expect(result.user).toEqual(user);
    });

    it('should return success false when username already exists', async () => {
      const user = {
        id: 'test-id',
        username: 'testuser',
        passwordHash: 'hashedpass',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const mockMulti = {
        setNX: jest.fn().mockReturnThis(),
        hSet: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 0],
          [null, 'OK'],
        ]), // setNX failed
      };

      mockRedisClient.multi.mockReturnValue(mockMulti);
      const client = new RedisClientService('redis://localhost:6379');

      const result = await client.saveUserWithUniqueIndex(
        'user:test-id',
        'username:testuser',
        user
      );

      expect(result.success).toBe(false);
      expect(result.user).toBeUndefined();
    });

    it('should return success false when transaction fails', async () => {
      const user = {
        id: 'test-id',
        username: 'testuser',
        passwordHash: 'hashedpass',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const mockMulti = {
        setNX: jest.fn().mockReturnThis(),
        hSet: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null), // Transaction failed
      };

      mockRedisClient.multi.mockReturnValue(mockMulti);
      const client = new RedisClientService('redis://localhost:6379');

      const result = await client.saveUserWithUniqueIndex(
        'user:test-id',
        'username:testuser',
        user
      );

      expect(result.success).toBe(false);
      expect(result.user).toBeUndefined();
    });
  });
});
