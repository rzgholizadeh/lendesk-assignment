import { createClient } from 'redis';

export function createRedisOmClient(url: string) {
  return createClient({ url });
}