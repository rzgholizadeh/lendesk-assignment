import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { createClient, RedisClientType } from 'redis';
import { logger } from '../../../src/common/logger/logger';

declare global {
  var redisContainer: StartedRedisContainer;
  var redisClient: RedisClientType;
}

const globalWithRedis = global as typeof globalThis & {
  redisContainer: StartedRedisContainer;
  redisClient: RedisClientType;
};

beforeAll(async () => {
  logger.info('Starting Redis container for integration tests...');

  globalWithRedis.redisContainer = await new RedisContainer('redis:8-alpine')
    .withExposedPorts(6379)
    .start();

  const redisUrl = `redis://localhost:${globalWithRedis.redisContainer.getMappedPort(6379)}`;
  logger.info(`Redis container started at: ${redisUrl}`);

  globalWithRedis.redisClient = createClient({ url: redisUrl });
  await globalWithRedis.redisClient.connect();

  logger.info('Connected to test Redis instance');
}, 60000);

afterAll(async () => {
  logger.info('Cleaning up Redis container...');

  if (globalWithRedis.redisClient) {
    await globalWithRedis.redisClient.disconnect();
  }

  if (globalWithRedis.redisContainer) {
    await globalWithRedis.redisContainer.stop();
  }

  logger.info('Redis container cleanup completed');
}, 30000);

afterEach(async () => {
  if (globalWithRedis.redisClient) {
    await globalWithRedis.redisClient.flushDb();
  }
});
