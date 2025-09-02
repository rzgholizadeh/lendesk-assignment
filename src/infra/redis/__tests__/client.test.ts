jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

jest.mock('../../../middleware/logger', () => ({
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
    };

    (require('redis').createClient as jest.Mock).mockReturnValue(
      mockRedisClient
    );

    mockLogger = require('../../../middleware/logger').logger;
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

    it('should delegate multi() to underlying Redis client', () => {
      const mockMulti = { hSet: jest.fn(), set: jest.fn(), exec: jest.fn() };
      mockRedisClient.multi.mockReturnValue(mockMulti);
      const client = new RedisClientService('redis://localhost:6379');

      const result = client.multi();

      expect(mockRedisClient.multi).toHaveBeenCalled();
      expect(result).toBe(mockMulti);
    });

    it('should delegate hGetAll() to underlying Redis client', async () => {
      const mockData = { field1: 'value1', field2: 'value2' };
      mockRedisClient.hGetAll.mockResolvedValue(mockData);
      const client = new RedisClientService('redis://localhost:6379');

      const result = await client.hGetAll('test-key');

      expect(mockRedisClient.hGetAll).toHaveBeenCalledWith('test-key');
      expect(result).toBe(mockData);
    });

    it('should delegate get() to underlying Redis client', async () => {
      mockRedisClient.get.mockResolvedValue('test-value');
      const client = new RedisClientService('redis://localhost:6379');

      const result = await client.get('test-key');

      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
      expect(result).toBe('test-value');
    });
  });
});
