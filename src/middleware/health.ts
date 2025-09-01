import { Request, Response } from 'express';
import { config } from '../config';

export const healthCheckHandler = (req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.environment,
  });
};
