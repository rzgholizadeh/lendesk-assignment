import { Router } from 'express';
import { createAuthController } from './auth/auth.controller';
import { IAuthService } from './auth/auth.service';

export interface AppDependencies {
  authService: IAuthService;
}

export const createApiRouter = (dependencies: AppDependencies): Router => {
  const apiRouter = Router();

  const { registerUser, loginUser } = createAuthController(
    dependencies.authService
  );

  apiRouter.post('/auth/register', registerUser);
  apiRouter.post('/auth/login', loginUser);

  return apiRouter;
};
