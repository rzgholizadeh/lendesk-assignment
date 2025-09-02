import { Router } from 'express';
import { createAuthController } from './auth/auth.controller';
import { IAuthService } from './auth/auth.service';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/async-handler';
import { registerSchema, loginSchema } from './auth/auth.schema';

export interface AppDependencies {
  authService: IAuthService;
}

export const createApiRouter = (dependencies: AppDependencies): Router => {
  const apiRouter = Router();

  const { registerUser, loginUser } = createAuthController(
    dependencies.authService
  );

  apiRouter.post(
    '/auth/register',
    validate(registerSchema),
    asyncHandler(registerUser)
  );
  apiRouter.post('/auth/login', validate(loginSchema), asyncHandler(loginUser));

  return apiRouter;
};
