import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../common/error/http-errors';
import { logger } from '../common/logger/logger';
import { ErrorResponse } from '../api/auth/auth.schema';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    const response: ErrorResponse = { message: 'Validation failed' };
    return res.status(400).json(response);
  }

  if (err instanceof HttpError) {
    const response: ErrorResponse = { message: err.message };
    return res.status(err.status).json(response);
  }

  logger.error('Unhandled error', { err });
  const response: ErrorResponse = { message: 'Internal Server Error' };
  return res.status(500).json(response);
}
