import { RegisterRequest, LoginRequest } from './auth.schema';
import { IAuthRepository } from './auth.repository';
import { IPasswordStrategy } from './strategies/IPasswordStrategy';
import {
  ConflictError,
  UnauthorizedError,
} from '../../common/error/http-errors';

export interface IAuthService {
  registerUser(userData: RegisterRequest): Promise<{ username: string }>;
  loginUser(credentials: LoginRequest): Promise<{ username: string }>;
}

export class AuthService implements IAuthService {
  constructor(
    private readonly authRepository: IAuthRepository,
    private readonly passwordStrategy: IPasswordStrategy
  ) {}

  public async registerUser(
    userData: RegisterRequest
  ): Promise<{ username: string }> {
    const userExists = await this.authRepository.userExists(userData.username);
    if (userExists) {
      throw new ConflictError();
    }

    const passwordHash = await this.passwordStrategy.hash(userData.password);

    const user = await this.authRepository.createUser(
      userData.username,
      passwordHash
    );

    return {
      username: user.username,
    };
  }

  public async loginUser(
    credentials: LoginRequest
  ): Promise<{ username: string }> {
    const user = await this.authRepository.findByUsername(credentials.username);
    if (!user) {
      throw new UnauthorizedError();
    }

    const isPasswordValid = await this.passwordStrategy.verify(
      credentials.password,
      user.passwordHash
    );
    if (!isPasswordValid) {
      throw new UnauthorizedError();
    }

    return {
      username: user.username,
    };
  }
}
