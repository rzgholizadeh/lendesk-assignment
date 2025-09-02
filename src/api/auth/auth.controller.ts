import { Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import {
  registerSchema,
  loginSchema,
  RegisterRequest,
  LoginRequest,
} from './auth.schema';
import { IAuthService } from './auth.service';
import { logger } from '../../middleware/logger';

interface IAuthController {
  registerUser: RequestHandler<object, unknown, RegisterRequest>;
  loginUser: RequestHandler<object, unknown, LoginRequest>;
}

export const createAuthController = (
  authService: IAuthService
): IAuthController => {
  const registerUser = async (
    req: Request<object, unknown, RegisterRequest>,
    res: Response
  ): Promise<void> => {
    try {
      const validatedData = registerSchema.parse(req.body);

      const result = await authService.registerUser(validatedData);

      if (!result.success) {
        if (result.error === 'Username already exists') {
          res.status(409).json({ error: result.error });
          return;
        }
        res.status(500).json({ error: result.error || 'Registration failed' });
        return;
      }

      res.status(201).json({
        message: 'User registered successfully',
        userId: result.data!.userId,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((issue) => issue.message);
        res.status(400).json({
          error: errorMessages.join(', '),
        });
        return;
      }

      logger.error('Registration error', { error });
      res.status(500).json({
        error: 'Registration failed',
      });
    }
  };

  const loginUser = async (
    req: Request<object, unknown, LoginRequest>,
    res: Response
  ): Promise<void> => {
    try {
      const validatedData = loginSchema.parse(req.body);

      const result = await authService.loginUser(validatedData);

      if (!result.success) {
        res.status(401).json({ error: result.error || 'Invalid credentials' });
        return;
      }

      res.status(200).json({
        message: 'Login successful',
        userId: result.data!.userId,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((issue) => issue.message);
        res.status(400).json({
          error: errorMessages.join(', '),
        });
        return;
      }

      logger.error('Authentication error', { error });
      res.status(500).json({
        error: 'Authentication failed',
      });
    }
  };

  return { registerUser, loginUser };
};
