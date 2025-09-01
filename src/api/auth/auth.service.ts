import bcrypt from 'bcrypt';
import { RegisterRequest, LoginRequest } from './auth.schema';
import { IAuthRepository } from './auth.repository';

export interface AuthServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface RegisterResult {
  userId: string;
  username: string;
}

export interface LoginResult {
  userId: string;
  username: string;
}

export interface IAuthService {
  registerUser(
    userData: RegisterRequest
  ): Promise<AuthServiceResult<RegisterResult>>;
  loginUser(credentials: LoginRequest): Promise<AuthServiceResult<LoginResult>>;
}

export class AuthService implements IAuthService {
  private readonly saltRounds = 12; // NOTE needs to be handled in env variables and config

  constructor(private readonly authRepository: IAuthRepository) {}

  public async registerUser(
    userData: RegisterRequest
  ): Promise<AuthServiceResult<RegisterResult>> {
    try {
      const userExists = await this.authRepository.userExists(
        userData.username
      );
      if (userExists) {
        return {
          success: false,
          error: 'Username already exists',
        };
      }

      const passwordHash = await bcrypt.hash(
        userData.password,
        this.saltRounds
      );

      const user = await this.authRepository.createUser({
        username: userData.username,
        passwordHash,
      });

      return {
        success: true,
        data: {
          userId: user.id,
          username: user.username,
        },
      };
    } catch (error) {
      console.error('Error registering user:', error);
      return {
        success: false,
        error: 'Registration failed',
      };
    }
  }

  public async loginUser(
    credentials: LoginRequest
  ): Promise<AuthServiceResult<LoginResult>> {
    try {
      const user = await this.authRepository.findByUsername(
        credentials.username
      );
      if (!user) {
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      const isPasswordValid = await bcrypt.compare(
        credentials.password,
        user.passwordHash
      );
      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      return {
        success: true,
        data: {
          userId: user.id,
          username: user.username,
        },
      };
    } catch (error) {
      console.error('Error logging in user:', error);
      return {
        success: false,
        error: 'Authentication failed',
      };
    }
  }
}
