import { Request, Response } from 'express';
import { createAuthController } from '../auth.controller';
import { IAuthService } from '../auth.service';

describe('Auth Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockAuthService: jest.Mocked<IAuthService>;
  let registerUser: (req: Request, res: Response) => Promise<void>;
  let loginUser: (req: Request, res: Response) => Promise<void>;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();

    mockRequest = {};
    mockResponse = {
      json: mockJson,
      status: mockStatus,
    };

    mockAuthService = {
      registerUser: jest.fn(),
      loginUser: jest.fn(),
    };

    const authController = createAuthController(mockAuthService);
    registerUser = authController.registerUser;
    loginUser = authController.loginUser;

    jest.spyOn(console, 'error').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('registerUser', () => {
    it('should successfully register a user with valid credentials', async () => {
      mockRequest.body = { username: 'testuser', password: 'testpassword123' };
      mockAuthService.registerUser.mockResolvedValue({
        success: true,
        data: { userId: 'user_123', username: 'testuser' },
      });

      await registerUser(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.registerUser).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'testpassword123',
      });
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'User registered successfully',
        userId: 'user_123',
      });
    });

    it('should return 400 when username is missing', async () => {
      mockRequest.body = { password: 'testpassword123' };

      await registerUser(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.registerUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid input: expected string, received undefined',
      });
    });

    it('should return 400 when password is missing', async () => {
      mockRequest.body = { username: 'testuser' };

      await registerUser(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.registerUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid input: expected string, received undefined',
      });
    });

    it('should return 400 when username is not a string', async () => {
      mockRequest.body = { username: 123, password: 'testpassword123' };

      await registerUser(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.registerUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid input: expected string, received number',
      });
    });

    it('should return 400 when password is not a string', async () => {
      mockRequest.body = { username: 'testuser', password: 123 };

      await registerUser(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.registerUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid input: expected string, received number',
      });
    });

    it('should return 400 when username is too short', async () => {
      mockRequest.body = { username: 'ab', password: 'testpassword123' };

      await registerUser(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.registerUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Username must be at least 3 characters long',
      });
    });

    it('should return 400 when password is too short', async () => {
      mockRequest.body = { username: 'testuser', password: 'short' };

      await registerUser(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.registerUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Password must be at least 8 characters long',
      });
    });

    it('should return 400 when username contains invalid characters', async () => {
      mockRequest.body = { username: 'test@user', password: 'testpassword123' };

      await registerUser(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.registerUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Username can only contain letters, numbers, and underscores',
      });
    });

    it('should return 500 when service throws an unexpected error', async () => {
      mockRequest.body = { username: 'testuser', password: 'testpassword123' };
      mockAuthService.registerUser.mockRejectedValue(
        new Error('Database connection failed')
      );

      await registerUser(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.registerUser).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'testpassword123',
      });
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Registration failed',
      });
      expect(console.error).toHaveBeenCalledWith(
        'Registration error:',
        expect.any(Error)
      );
    });

    it('should return 409 when username already exists', async () => {
      mockRequest.body = {
        username: 'existinguser',
        password: 'testpassword123',
      };
      mockAuthService.registerUser.mockResolvedValue({
        success: false,
        error: 'Username already exists',
      });

      await registerUser(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.registerUser).toHaveBeenCalledWith({
        username: 'existinguser',
        password: 'testpassword123',
      });
      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Username already exists',
      });
    });
  });

  describe('loginUser', () => {
    it('should successfully login a user with valid credentials', async () => {
      mockRequest.body = { username: 'testuser', password: 'testpass' };
      mockAuthService.loginUser.mockResolvedValue({
        success: true,
        data: { userId: 'user_456', username: 'testuser' },
      });

      await loginUser(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.loginUser).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'testpass',
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Login successful',
        userId: 'user_456',
      });
    });

    it('should return 400 when username is missing', async () => {
      mockRequest.body = { password: 'testpass' };

      await loginUser(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.loginUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid input: expected string, received undefined',
      });
    });

    it('should return 400 when password is missing', async () => {
      mockRequest.body = { username: 'testuser' };

      await loginUser(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.loginUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid input: expected string, received undefined',
      });
    });

    it('should return 400 when username is not a string', async () => {
      mockRequest.body = { username: 123, password: 'testpass' };

      await loginUser(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.loginUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid input: expected string, received number',
      });
    });

    it('should return 400 when password is not a string', async () => {
      mockRequest.body = { username: 'testuser', password: 123 };

      await loginUser(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.loginUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid input: expected string, received number',
      });
    });

    it('should return 400 when username is empty', async () => {
      mockRequest.body = { username: '', password: 'testpass' };

      await loginUser(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.loginUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Username is required',
      });
    });

    it('should return 400 when password is empty', async () => {
      mockRequest.body = { username: 'testuser', password: '' };

      await loginUser(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.loginUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Password is required',
      });
    });

    it('should return 500 when service throws an unexpected error', async () => {
      mockRequest.body = { username: 'testuser', password: 'testpass' };
      mockAuthService.loginUser.mockRejectedValue(
        new Error('Database connection failed')
      );

      await loginUser(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.loginUser).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'testpass',
      });
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Authentication failed',
      });
      expect(console.error).toHaveBeenCalledWith(
        'Authentication error:',
        expect.any(Error)
      );
    });

    it('should return 401 when credentials are invalid', async () => {
      mockRequest.body = { username: 'testuser', password: 'wrongpass' };
      mockAuthService.loginUser.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });

      await loginUser(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.loginUser).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'wrongpass',
      });
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid credentials',
      });
    });
  });

  describe('JSON Response Format', () => {
    it('should return valid JSON for successful registration', async () => {
      mockRequest.body = { username: 'testuser', password: 'testpassword123' };
      mockAuthService.registerUser.mockResolvedValue({
        success: true,
        data: { userId: 'user_123', username: 'testuser' },
      });

      await registerUser(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.any(String),
          userId: expect.any(String),
        })
      );
    });

    it('should return valid JSON for successful login', async () => {
      mockRequest.body = { username: 'testuser', password: 'testpass' };
      mockAuthService.loginUser.mockResolvedValue({
        success: true,
        data: { userId: 'user_456', username: 'testuser' },
      });

      await loginUser(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.any(String),
          userId: expect.any(String),
        })
      );
    });

    it('should return consistent error structure for registration errors', async () => {
      mockRequest.body = { username: 'ab', password: 'testpassword123' };

      await registerUser(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.registerUser).not.toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
        })
      );
    });

    it('should return consistent error structure for login errors', async () => {
      mockRequest.body = { username: '', password: 'testpass' };

      await loginUser(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.loginUser).not.toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
        })
      );
    });
  });
});
