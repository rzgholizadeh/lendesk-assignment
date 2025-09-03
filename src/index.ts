import http from 'node:http';
import { createApp } from './server';
import { AuthRepository } from './api/auth/auth.repository';
import { AuthService } from './api/auth/auth.service';
import { AuthController } from './api/auth/auth.controller';
import { BcryptStrategy } from './api/auth/strategies/BcryptStrategy';
import { RedisClientService } from './infra/redis/client';
import { config } from './config';
import { logger } from './common/logger/logger';

interface ServerWithRedisClient extends http.Server {
  redisClient?: RedisClientService;
}

async function bootstrap(): Promise<ServerWithRedisClient> {
  const redisClient = new RedisClientService(config.redisUrl);
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error('Bootstrap failed: Redis connection error:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const passwordStrategy = new BcryptStrategy(config.saltRounds);
  const authRepository = new AuthRepository(redisClient);
  const authService = new AuthService(authRepository, passwordStrategy);
  const authController = new AuthController(authService);

  const app = createApp({ authController });

  const server = app.listen(config.port, '0.0.0.0', () => {
    logger.info(
      `HTTP server started on port ${config.port} (env: ${config.environment})`
    );
  }) as ServerWithRedisClient;

  server.on('error', (err) => {
    logger.error('HTTP server error:', { err });
    process.exit(1);
  });

  server.redisClient = redisClient;

  return server;
}

(async () => {
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception:', { err });
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', { reason });
    process.exit(1);
  });

  const server = await bootstrap();

  const shutdown = async (signal: string) => {
    logger.info(`Received shutdown signal: ${signal}`);
    try {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });

      if (server.redisClient) {
        try {
          await server.redisClient.quit();
        } catch (quitError) {
          logger.warn('Redis quit() failed, falling back to disconnect():', {
            error:
              quitError instanceof Error
                ? quitError.message
                : String(quitError),
          });
          await server.redisClient.disconnect();
        }
      }

      logger.info('Shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error('Shutdown error:', {
        error: err instanceof Error ? err.message : String(err),
      });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
})().catch((err) => {
  logger.error('Bootstrap failed:', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
