jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

jest.mock('../../../middleware/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Redis Client', () => {
  let mockRedisClient: jest.Mocked<{
    connect: jest.Mock;
    on: jest.Mock;
    disconnect: jest.Mock;
  }>;
  let processExitSpy: jest.SpyInstance;
  let connectToRedis: () => Promise<typeof mockRedisClient>;
  let mockLogger: { info: jest.Mock; error: jest.Mock };

  beforeEach(() => {
    jest.resetModules();

    mockRedisClient = {
      connect: jest.fn(),
      on: jest.fn(),
      disconnect: jest.fn(),
    };

    (require('redis').createClient as jest.Mock).mockReturnValue(
      mockRedisClient
    );

    mockLogger = require('../../../middleware/logger').logger;
    mockLogger.info.mockClear();
    mockLogger.error.mockClear();
    
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation();

    const clientModule = require('../client');
    connectToRedis = clientModule.connectToRedis;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('redisClient creation', () => {
    it('should create Redis client with default URL', () => {
      const { createClient } = require('redis');

      expect(createClient).toHaveBeenCalledWith({
        url: 'redis://localhost:6379',
      });
    });

    it('should create Redis client with custom URL from environment', () => {
      const originalEnv = process.env.REDIS_URL;
      process.env.REDIS_URL = 'redis://custom-host:6380';

      jest.resetModules();
      require('../client');

      const { createClient } = require('redis');
      expect(createClient).toHaveBeenCalledWith({
        url: 'redis://custom-host:6380',
      });

      process.env.REDIS_URL = originalEnv;
    });
  });

  describe('connectToRedis', () => {
    it('should connect to Redis successfully', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);

      await connectToRedis();

      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Connected to Redis successfully'
      );
    });

    it('should handle connection failure and exit process', async () => {
      const connectionError = new Error('Redis connection failed');
      mockRedisClient.connect.mockRejectedValue(connectionError);

      await connectToRedis();

      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect to Redis:',
        { error: 'Redis connection failed' }
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('ETIMEDOUT');
      mockRedisClient.connect.mockRejectedValue(timeoutError);

      await connectToRedis();

      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect to Redis:',
        { error: 'ETIMEDOUT' }
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle connection refused errors', async () => {
      const refusedError = new Error('ECONNREFUSED');
      mockRedisClient.connect.mockRejectedValue(refusedError);

      await connectToRedis();

      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect to Redis:',
        { error: 'ECONNREFUSED' }
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});
