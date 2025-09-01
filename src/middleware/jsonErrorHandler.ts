import { Request, Response, NextFunction } from 'express';

export const jsonErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (
    error instanceof SyntaxError &&
    (error as SyntaxError & { status: number }).status === 400 &&
    'body' in error
  ) {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }
  next(error);
};
