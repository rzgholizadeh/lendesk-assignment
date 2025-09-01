import http from 'node:http';
import { createApp } from './server';
import { AuthRepository } from './api/auth/auth.repository';
import { AuthService } from './api/auth/auth.service';
import {
  redisClient,
  connectToRedis,
  disconnectFromRedis,
} from './infra/redis/client';
import { config } from './config';
import { logger } from './middleware/logger';

async function bootstrap(): Promise<http.Server> {
  // 1) Connect infra first (fail fast)
  await connectToRedis();

  // 2) Wire dependencies (no global setters)
  const authRepository = new AuthRepository(redisClient);
  const authService = new AuthService(authRepository);

  // 3) Build the app with its deps (DI via factory args)
  const app = createApp({ authService });

  // 4) Start HTTP server (bind on 0.0.0.0 for containers)
  const server = app.listen(config.port, '0.0.0.0', () => {
    logger.info(
      `HTTP server started on port ${config.port} (env: ${config.environment})`
    );
  });

  // Handle server errors
  server.on('error', (err) => {
    logger.error('HTTP server error:', {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  });

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
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      await disconnectFromRedis();
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
