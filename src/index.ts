import http from 'node:http';
import { createApp } from './server';
import { AuthRepository } from './api/auth/auth.repository';
import { AuthService } from './api/auth/auth.service';
import { BcryptStrategy } from './api/auth/strategies/BcryptStrategy';
import { RedisClientService } from './infra/redis/client';
import { config } from './config';
import { logger } from './common/logger/logger';

interface ServerWithRedisClient extends http.Server {
  redisClient?: RedisClientService;
}

async function bootstrap(): Promise<ServerWithRedisClient> {
  // 1) Create and connect Redis client
  const redisClient = new RedisClientService(config.redisUrl);
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error('Bootstrap failed: Redis connection error:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error; // Let the composition root decide what to do
  }

  // 2) Wire dependencies (no global setters)
  const passwordStrategy = new BcryptStrategy(config.saltRounds);
  const authRepository = new AuthRepository(redisClient);
  const authService = new AuthService(authRepository, passwordStrategy);

  // 3) Build the app with its deps (DI via factory args)
  const app = createApp({ authService });

  // 4) Start HTTP server (bind on 0.0.0.0 for containers)
  const server = app.listen(config.port, '0.0.0.0', () => {
    logger.info(
      `HTTP server started on port ${config.port} (env: ${config.environment})`
    );
  }) as ServerWithRedisClient;

  // Handle server errors
  server.on('error', (err) => {
    logger.error('HTTP server error:', {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  });

  // Store redisClient reference for cleanup
  server.redisClient = redisClient;

  return server;
}

(async () => {
  // Guard rails for unhandled failures
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception:', {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', { reason });
    process.exit(1);
  });

  const server = await bootstrap();

  // Graceful shutdown (SIGTERM/SIGINT from Docker/K8s)
  const shutdown = async (signal: string) => {
    logger.info(`Received shutdown signal: ${signal}`);
    try {
      // Close HTTP server first
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });

      // Gracefully quit Redis client
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
  // Final catch-all for bootstrap errors
  logger.error('Bootstrap failed:', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
