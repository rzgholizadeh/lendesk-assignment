import { createClient } from 'redis';
import { logger } from '../../middleware/logger';

export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

export const connectToRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    logger.info('Connected to Redis successfully');
  } catch (error) {
    logger.error('Failed to connect to Redis:', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
};

export const disconnectFromRedis = async (): Promise<void> => {
  try {
    await redisClient.disconnect();
    logger.info('Disconnected from Redis successfully');
  } catch (error) {
    logger.error('Failed to disconnect from Redis:', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
