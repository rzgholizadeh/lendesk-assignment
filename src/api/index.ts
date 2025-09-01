import { Router } from 'express';
import { createAuthController } from './auth/auth.controller';
import { IAuthService } from './auth/auth.service';

interface ApiDependencies {
  authService: IAuthService;
}

export const createApiRouter = (dependencies: ApiDependencies): Router => {
  const apiRouter = Router();

  const { registerUser, loginUser } = createAuthController(
    dependencies.authService
  );

  apiRouter.post('/auth/register', registerUser);
  apiRouter.post('/auth/login', loginUser);

  return apiRouter;
};
