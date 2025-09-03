import { Router } from 'express';
import { AuthController } from './auth/auth.controller';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/async-handler';
import { registerSchema, loginSchema } from './auth/auth.schema';

export interface AppDependencies {
  authController: AuthController;
}

export const createApiRouter = (dependencies: AppDependencies): Router => {
  const apiRouter = Router();
  const { authController } = dependencies;

  apiRouter.post(
    '/auth/register',
    validate(registerSchema),
    asyncHandler(authController.registerUser)
  );

  apiRouter.post(
    '/auth/login',
    validate(loginSchema),
    asyncHandler(authController.loginUser)
  );

  return apiRouter;
};
