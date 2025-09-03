import { Request, Response } from 'express';
import { ZodError, ZodType } from 'zod';
import {
  RegisterRequest,
  LoginRequest,
  RegisterResponse,
  LoginResponse,
  registerResponseSchema,
  loginResponseSchema,
  ErrorResponse,
} from './auth.schema';
import { IAuthService } from './auth.service';
import { ResponseValidationError } from '../../common/error/http-errors';

export class AuthController {
  constructor(private readonly authService: IAuthService) {}

  private validateResponse<T>(schema: ZodType<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ResponseValidationError();
      }
      throw error;
    }
  }

  public registerUser = async (
    req: Request<object, RegisterResponse, RegisterRequest>,
    res: Response<RegisterResponse | ErrorResponse>
  ): Promise<void> => {
    const data = req.body as RegisterRequest;
    const user = await this.authService.registerUser(data);

    const response: RegisterResponse = {
      message: 'User registered successfully',
      userId: user.userId,
    };

    const validatedResponse = this.validateResponse(
      registerResponseSchema,
      response
    );
    res.status(201).json(validatedResponse);
  };

  public loginUser = async (
    req: Request<object, LoginResponse, LoginRequest>,
    res: Response<LoginResponse | ErrorResponse>
  ): Promise<void> => {
    const data = req.body as LoginRequest;
    const user = await this.authService.loginUser(data);

    const response: LoginResponse = {
      message: 'Login successful',
      userId: user.userId,
    };

    const validatedResponse = this.validateResponse(
      loginResponseSchema,
      response
    );
    res.status(200).json(validatedResponse);
  };
}
