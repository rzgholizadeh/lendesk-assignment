import { AuthService } from '../auth.service';
import { IAuthRepository } from '../auth.repository';
import { IPasswordStrategy } from '../strategies/IPasswordStrategy';
import { User } from '../auth.model';
import {
  ConflictError,
  UnauthorizedError,
} from '../../../common/error/http-errors';
import { DuplicateKeyError } from '../auth.errors';

jest.mock('../../../common/logger/logger');

describe('AuthService', () => {
  let authService: AuthService;
  let mockAuthRepository: jest.Mocked<IAuthRepository>;
  let mockPasswordStrategy: jest.Mocked<IPasswordStrategy>;

  beforeEach(() => {
    mockAuthRepository = {
      createUser: jest.fn(),
      findByUsername: jest.fn(),
      findById: jest.fn(),
      userExists: jest.fn(),
    };

    mockPasswordStrategy = {
      hash: jest.fn(),
      verify: jest.fn(),
    };

    authService = new AuthService(mockAuthRepository, mockPasswordStrategy);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    const validUserData = {
      username: 'testuser',
      password: 'password123',
    };

    it('should register a user successfully', async () => {
      const mockUser: User = {
        id: 'test-uuid-123',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      };

      mockPasswordStrategy.hash.mockResolvedValue('hashedpassword123');
      mockAuthRepository.createUser.mockResolvedValue(mockUser);

      const result = await authService.registerUser(validUserData);

      expect(mockPasswordStrategy.hash).toHaveBeenCalledWith('password123');
      expect(mockAuthRepository.createUser).toHaveBeenCalledWith(
        'testuser',
        'hashedpassword123'
      );

      expect(result).toEqual({
        username: 'testuser',
      });
    });

    it('should throw ConflictError when DuplicateKeyError occurs', async () => {
      mockPasswordStrategy.hash.mockResolvedValue('hashedpassword123');
      mockAuthRepository.createUser.mockRejectedValue(
        new DuplicateKeyError('username:testuser')
      );

      await expect(authService.registerUser(validUserData)).rejects.toThrow(
        ConflictError
      );

      expect(mockPasswordStrategy.hash).toHaveBeenCalledWith('password123');
      expect(mockAuthRepository.createUser).toHaveBeenCalledWith(
        'testuser',
        'hashedpassword123'
      );
    });

    it('should propagate other errors from repository', async () => {
      mockPasswordStrategy.hash.mockResolvedValue('hashedpassword123');
      mockAuthRepository.createUser.mockRejectedValue(
        new Error('Redis connection failed')
      );

      await expect(authService.registerUser(validUserData)).rejects.toThrow(
        'Redis connection failed'
      );
    });

    // Note: Database and hashing error tests removed - these now bubble up directly
    // The asyncHandler middleware will catch and handle these errors
  });

  describe('loginUser', () => {
    const validCredentials = {
      username: 'testuser',
      password: 'password123',
    };

    const mockUser: User = {
      id: 'test-uuid-123',
      username: 'testuser',
      passwordHash: 'hashedpassword123',
      createdAt: new Date('2023-01-01T00:00:00.000Z'),
      updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    };

    it('should login user successfully with valid credentials', async () => {
      mockAuthRepository.findByUsername.mockResolvedValue(mockUser);
      mockPasswordStrategy.verify.mockResolvedValue(true);

      const result = await authService.loginUser(validCredentials);

      expect(mockAuthRepository.findByUsername).toHaveBeenCalledWith(
        'testuser'
      );
      expect(mockPasswordStrategy.verify).toHaveBeenCalledWith(
        'password123',
        'hashedpassword123'
      );

      expect(result).toEqual({
        username: 'testuser',
      });
    });

    it('should throw UnauthorizedError when user does not exist', async () => {
      mockAuthRepository.findByUsername.mockResolvedValue(null);

      await expect(authService.loginUser(validCredentials)).rejects.toThrow(
        UnauthorizedError
      );

      expect(mockAuthRepository.findByUsername).toHaveBeenCalledWith(
        'testuser'
      );
      expect(mockPasswordStrategy.verify).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when password is invalid', async () => {
      mockAuthRepository.findByUsername.mockResolvedValue(mockUser);
      mockPasswordStrategy.verify.mockResolvedValue(false);

      await expect(authService.loginUser(validCredentials)).rejects.toThrow(
        UnauthorizedError
      );

      expect(mockAuthRepository.findByUsername).toHaveBeenCalledWith(
        'testuser'
      );
      expect(mockPasswordStrategy.verify).toHaveBeenCalledWith(
        'password123',
        'hashedpassword123'
      );
    });

    // Note: Database and strategy error tests removed - these now bubble up directly
    // The asyncHandler middleware will catch and handle these errors
  });

  describe('dependency injection', () => {
    it('should be constructed with password strategy', () => {
      expect(authService).toBeInstanceOf(AuthService);
      expect(mockPasswordStrategy.hash).toBeDefined();
      expect(mockPasswordStrategy.verify).toBeDefined();
    });
  });
});
