import { Repository } from 'redis-om';
import { userSchema } from '../schema/user.schema';
import { createRedisOmClient } from '../client';

export function createUserRepository(client: ReturnType<typeof createRedisOmClient>): Repository {
  return new Repository(userSchema, client);
}