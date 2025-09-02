import { Request, Response } from 'express';
import { RegisterRequest, LoginRequest } from './auth.schema';
import { IAuthService } from './auth.service';

export const createAuthController = (authService: IAuthService) => {
  const registerUser = async (
    req: Request<object, unknown, RegisterRequest>,
    res: Response
  ): Promise<void> => {
    const data = req.body as RegisterRequest;
    const user = await authService.registerUser(data);
    res.status(201).json({ ok: true, user });
  };

  const loginUser = async (
    req: Request<object, unknown, LoginRequest>,
    res: Response
  ): Promise<void> => {
    const data = req.body as LoginRequest;
    const user = await authService.loginUser(data);
    res.status(200).json({ ok: true, user });
  };

  return { registerUser, loginUser };
};
