import { NextFunction, Request, Response } from 'express';
import { ZodType, ZodError } from 'zod';
import { logger } from '../common/logger/logger';

const SENSITIVE_FIELDS = [
  'password',
  'confirmPassword',
  'token',
  'secret',
  'apiKey',
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sanitizeBody = (body: any): any => {
  if (!body || typeof body !== 'object') return body;

  const sanitized = { ...body };
  SENSITIVE_FIELDS.forEach((field) => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  });
  return sanitized;
};

export const validate =
  (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    logger.info('Validating request', {
      path: req.path,
      method: req.method,
      body: sanitizeBody(req.body),
      contentType: req.get('Content-Type'),
    });

    const result = schema.safeParse(req.body);
    if (result.success) {
      logger.info('Validation passed', { data: sanitizeBody(result.data) });
      req.body = result.data;
      return next();
    }

    logger.warn('Validation failed', {
      err: result.error,
      originalBody: sanitizeBody(req.body),
    });
    return next(result.error as ZodError);
  };
