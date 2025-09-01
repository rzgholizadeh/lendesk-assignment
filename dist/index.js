"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
const auth_repository_1 = require("./api/auth/auth.repository");
const auth_service_1 = require("./api/auth/auth.service");
const client_1 = require("./infra/redis/client");
const config_1 = require("./config");
const logger_1 = require("./middleware/logger");
async function bootstrap() {
    // 1) Connect infra first (fail fast)
    await (0, client_1.connectToRedis)();
    // 2) Wire dependencies (no global setters)
    const authRepository = new auth_repository_1.AuthRepository(client_1.redisClient);
    const authService = new auth_service_1.AuthService(authRepository);
    // 3) Build the app with its deps (DI via factory args)
    const app = (0, server_1.createApp)({ authService });
    // 4) Start HTTP server (bind on 0.0.0.0 for containers)
    const server = app.listen(config_1.config.port, '0.0.0.0', () => {
        logger_1.logger.info(`HTTP server started on port ${config_1.config.port} (env: ${config_1.config.environment})`);
    });
    // Handle server errors
    server.on('error', (err) => {
        logger_1.logger.error('HTTP server error:', { error: err.message, stack: err.stack });
        process.exit(1);
    });
    return server;
}
(async () => {
    // Guard rails for unhandled failures
    process.on('uncaughtException', (err) => {
        logger_1.logger.error('Uncaught exception:', { error: err.message, stack: err.stack });
        process.exit(1);
    });
    process.on('unhandledRejection', (reason) => {
        logger_1.logger.error('Unhandled rejection:', { reason });
        process.exit(1);
    });
    const server = await bootstrap();
    // Graceful shutdown (SIGTERM/SIGINT from Docker/K8s)
    const shutdown = async (signal) => {
        logger_1.logger.info(`Received shutdown signal: ${signal}`);
        try {
            await new Promise((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()));
            });
            await (0, client_1.disconnectFromRedis)();
            logger_1.logger.info('Shutdown complete');
            process.exit(0);
        }
        catch (err) {
            logger_1.logger.error('Shutdown error:', { error: err instanceof Error ? err.message : String(err) });
            process.exit(1);
        }
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
})().catch((err) => {
    // Final catch-all for bootstrap errors
    logger_1.logger.error('Bootstrap failed:', { error: err instanceof Error ? err.message : String(err) });
    process.exit(1);
});
//# sourceMappingURL=index.js.map