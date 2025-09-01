import express, { Application } from 'express';
import helmet from 'helmet';
import { createApiRouter } from './api';
import { healthCheckHandler } from './middleware/health';
import { jsonErrorHandler } from './middleware/jsonErrorHandler';
import { IAuthService } from './api/auth/auth.service';

interface AppDependencies {
  authService: IAuthService;
}

export const createApp = (dependencies: AppDependencies): Application => {
  const app = express();

  app.use(helmet());
  app.use(express.json());
  app.use(jsonErrorHandler);

  // Health check
  app.get('/health', healthCheckHandler);

  // API routes with dependencies
  app.use('/api/v1', createApiRouter(dependencies));

  return app;
};
