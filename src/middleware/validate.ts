import { NextFunction, Request, Response } from 'express';
import { ZodType, ZodError, z } from 'zod';
import { logger } from '../common/logger/logger';

export const validate =
  (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    logger.info('Validating request', {
      path: req.path,
      method: req.method,
      body: req.body,
      contentType: req.get('Content-Type'),
    });

    const result = schema.safeParse(req.body);
    if (result.success) {
      logger.info('Validation passed', { data: result.data });
      req.body = result.data;
      return next();
    }

    logger.error('Validation failed', {
      error: z.treeifyError(result.error),
      originalBody: req.body,
    });
    return next(result.error as ZodError);
  };
