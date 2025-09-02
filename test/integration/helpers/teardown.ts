import { StartedRedisContainer } from '@testcontainers/redis';
import { RedisClientType } from 'redis';
import { logger } from '../../../src/common/logger/logger';

declare global {
  var redisContainer: StartedRedisContainer;
  var redisClient: RedisClientType;
}

const globalWithRedis = global as typeof globalThis & {
  redisContainer: StartedRedisContainer;
  redisClient: RedisClientType;
};

export default async (): Promise<void> => {
  logger.info('Global teardown: Cleaning up all test resources...');

  try {
    if (globalWithRedis.redisClient && globalWithRedis.redisClient.isOpen) {
      await globalWithRedis.redisClient.disconnect();
      logger.info('Disconnected from Redis client');
    }
  } catch (error) {
    logger.error('Error disconnecting Redis client:', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    if (globalWithRedis.redisContainer) {
      await globalWithRedis.redisContainer.stop();
      logger.info('Stopped Redis container');
    }
  } catch (error) {
    logger.error('Error stopping Redis container:', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  logger.info('Global teardown completed');
};
