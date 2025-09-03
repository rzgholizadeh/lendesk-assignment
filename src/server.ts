import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createApiRouter, AppDependencies } from './api';
import { healthCheckHandler } from './middleware/health';
import { jsonErrorHandler } from './middleware/jsonErrorHandler';
import { errorHandler } from './middleware/error';

export const createApp = (dependencies: AppDependencies): Application => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.NODE_ENV === 'production' ? false : true,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type'],
      credentials: false,
      maxAge: 86400,
    })
  );
  app.use(express.json());
  app.use(jsonErrorHandler);

  // Health check
  app.get('/health', healthCheckHandler);

  // API routes with dependencies
  app.use('/api/v1', createApiRouter(dependencies));
  app.use(errorHandler);

  return app;
};
