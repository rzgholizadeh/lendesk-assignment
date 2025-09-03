import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  environment: process.env.NODE_ENV || 'development',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  saltRounds: parseInt(process.env.SALT_ROUNDS || '12', 10),
  logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
} as const;
