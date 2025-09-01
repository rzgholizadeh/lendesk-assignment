import { logger } from '../../../src/middleware/logger';

export default async (): Promise<void> => {
  logger.info('Global teardown: Cleaning up all test resources...');

  try {
    if (global.redisClient && global.redisClient.isOpen) {
      await global.redisClient.disconnect();
      logger.info('Disconnected from Redis client');
    }
  } catch (error) {
    logger.error('Error disconnecting Redis client:', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    if (global.redisContainer) {
      await global.redisContainer.stop();
      logger.info('Stopped Redis container');
    }
  } catch (error) {
    logger.error('Error stopping Redis container:', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  logger.info('Global teardown completed');
};
