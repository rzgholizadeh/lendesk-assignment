import { Router } from 'express';
import { AuthController } from './auth/auth.controller';
import { requestValidationHandler } from '../middleware/request-validator.middleware';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { registerSchema, loginSchema } from './auth/auth.schema';

export interface AppDependencies {
  authController: AuthController;
}

export const createApiRouter = (dependencies: AppDependencies): Router => {
  const apiRouter = Router();
  const { authController } = dependencies;

  apiRouter.post(
    '/auth/register',
    requestValidationHandler(registerSchema),
    asyncHandler(authController.registerUser)
  );

  apiRouter.post(
    '/auth/login',
    requestValidationHandler(loginSchema),
    asyncHandler(authController.loginUser)
  );

  return apiRouter;
};
