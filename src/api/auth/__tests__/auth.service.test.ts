import { AuthService } from '../auth.service';
import { IAuthRepository } from '../auth.repository';
import { User } from '../auth.model';
import bcrypt from 'bcrypt';
import { logger } from '../../../middleware/logger';

jest.mock('bcrypt');
jest.mock('../../../middleware/logger');

describe('AuthService', () => {
  let authService: AuthService;
  let mockAuthRepository: jest.Mocked<IAuthRepository>;
  let mockBcrypt: jest.Mocked<typeof bcrypt>;

  beforeEach(() => {
    mockAuthRepository = {
      createUser: jest.fn(),
      findByUsername: jest.fn(),
      findById: jest.fn(),
      userExists: jest.fn(),
    };

    mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
    authService = new AuthService(mockAuthRepository);

    jest.mocked(logger.error).mockImplementation(jest.fn());
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

      mockAuthRepository.userExists.mockResolvedValue(false);
      mockBcrypt.hash.mockResolvedValue('hashedpassword123' as never);
      mockAuthRepository.createUser.mockResolvedValue(mockUser);

      const result = await authService.registerUser(validUserData);

      expect(mockAuthRepository.userExists).toHaveBeenCalledWith('testuser');
      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockAuthRepository.createUser).toHaveBeenCalledWith({
        username: 'testuser',
        passwordHash: 'hashedpassword123',
      });

      expect(result).toEqual({
        success: true,
        data: {
          userId: 'test-uuid-123',
          username: 'testuser',
        },
      });
    });

    it('should return error when username already exists', async () => {
      mockAuthRepository.userExists.mockResolvedValue(true);

      const result = await authService.registerUser(validUserData);

      expect(mockAuthRepository.userExists).toHaveBeenCalledWith('testuser');
      expect(mockBcrypt.hash).not.toHaveBeenCalled();
      expect(mockAuthRepository.createUser).not.toHaveBeenCalled();

      expect(result).toEqual({
        success: false,
        error: 'Username already exists',
      });
    });

    it('should return error when bcrypt hash fails', async () => {
      mockAuthRepository.userExists.mockResolvedValue(false);
      mockBcrypt.hash.mockRejectedValue(new Error('Hash failed') as never);

      const result = await authService.registerUser(validUserData);

      expect(mockAuthRepository.userExists).toHaveBeenCalledWith('testuser');
      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockAuthRepository.createUser).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('Error registering user', {
        error: expect.any(Error),
      });

      expect(result).toEqual({
        success: false,
        error: 'Registration failed',
      });
    });

    it('should return error when repository createUser fails', async () => {
      mockAuthRepository.userExists.mockResolvedValue(false);
      mockBcrypt.hash.mockResolvedValue('hashedpassword123' as never);
      mockAuthRepository.createUser.mockRejectedValue(
        new Error('Database error')
      );

      const result = await authService.registerUser(validUserData);

      expect(mockAuthRepository.userExists).toHaveBeenCalledWith('testuser');
      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockAuthRepository.createUser).toHaveBeenCalledWith({
        username: 'testuser',
        passwordHash: 'hashedpassword123',
      });
      expect(logger.error).toHaveBeenCalledWith('Error registering user', {
        error: expect.any(Error),
      });

      expect(result).toEqual({
        success: false,
        error: 'Registration failed',
      });
    });

    it('should return error when repository userExists fails', async () => {
      mockAuthRepository.userExists.mockRejectedValue(
        new Error('Database error')
      );

      const result = await authService.registerUser(validUserData);

      expect(mockAuthRepository.userExists).toHaveBeenCalledWith('testuser');
      expect(mockBcrypt.hash).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('Error registering user', {
        error: expect.any(Error),
      });

      expect(result).toEqual({
        success: false,
        error: 'Registration failed',
      });
    });
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
      mockBcrypt.compare.mockResolvedValue(true as never);

      const result = await authService.loginUser(validCredentials);

      expect(mockAuthRepository.findByUsername).toHaveBeenCalledWith(
        'testuser'
      );
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        'password123',
        'hashedpassword123'
      );

      expect(result).toEqual({
        success: true,
        data: {
          userId: 'test-uuid-123',
          username: 'testuser',
        },
      });
    });

    it('should return error when user does not exist', async () => {
      mockAuthRepository.findByUsername.mockResolvedValue(null);

      const result = await authService.loginUser(validCredentials);

      expect(mockAuthRepository.findByUsername).toHaveBeenCalledWith(
        'testuser'
      );
      expect(mockBcrypt.compare).not.toHaveBeenCalled();

      expect(result).toEqual({
        success: false,
        error: 'Invalid credentials',
      });
    });

    it('should return error when password is invalid', async () => {
      mockAuthRepository.findByUsername.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false as never);

      const result = await authService.loginUser(validCredentials);

      expect(mockAuthRepository.findByUsername).toHaveBeenCalledWith(
        'testuser'
      );
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        'password123',
        'hashedpassword123'
      );

      expect(result).toEqual({
        success: false,
        error: 'Invalid credentials',
      });
    });

    it('should return error when repository findByUsername fails', async () => {
      mockAuthRepository.findByUsername.mockRejectedValue(
        new Error('Database error')
      );

      const result = await authService.loginUser(validCredentials);

      expect(mockAuthRepository.findByUsername).toHaveBeenCalledWith(
        'testuser'
      );
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('Error logging in user', {
        error: expect.any(Error),
      });

      expect(result).toEqual({
        success: false,
        error: 'Authentication failed',
      });
    });

    it('should return error when bcrypt compare fails', async () => {
      mockAuthRepository.findByUsername.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockRejectedValue(new Error('Bcrypt error') as never);

      const result = await authService.loginUser(validCredentials);

      expect(mockAuthRepository.findByUsername).toHaveBeenCalledWith(
        'testuser'
      );
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        'password123',
        'hashedpassword123'
      );
      expect(logger.error).toHaveBeenCalledWith('Error logging in user', {
        error: expect.any(Error),
      });

      expect(result).toEqual({
        success: false,
        error: 'Authentication failed',
      });
    });
  });

  describe('configuration', () => {
    it('should use salt rounds of 12', () => {
      const saltRounds = (authService as unknown as { saltRounds: number })
        .saltRounds;
      expect(saltRounds).toBe(12);
    });
  });
});
