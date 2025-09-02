import { Request, Response, RequestHandler } from 'express';
import { createAuthController } from '../auth.controller';
import { IAuthService } from '../auth.service';

jest.mock('../../../common/logger/logger');

describe('Auth Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockAuthService: jest.Mocked<IAuthService>;
  let registerUser: RequestHandler;
  let loginUser: RequestHandler;

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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('registerUser', () => {
    it('should successfully register a user with valid credentials', async () => {
      mockRequest.body = { username: 'testuser', password: 'testpassword123' };
      mockAuthService.registerUser.mockResolvedValue({
        userId: 'user_123',
        username: 'testuser',
      });

      await registerUser(
        mockRequest as Request,
        mockResponse as Response,
        jest.fn()
      );

      expect(mockAuthService.registerUser).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'testpassword123',
      });
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        ok: true,
        user: {
          userId: 'user_123',
          username: 'testuser',
        },
      });
    });

    // Note: Validation tests removed - now handled by validation middleware
    // Controller only handles successful service calls and lets asyncHandler handle errors
  });

  describe('loginUser', () => {
    it('should successfully login a user with valid credentials', async () => {
      mockRequest.body = { username: 'testuser', password: 'testpass' };
      mockAuthService.loginUser.mockResolvedValue({
        userId: 'user_456',
        username: 'testuser',
      });

      await loginUser(
        mockRequest as Request,
        mockResponse as Response,
        jest.fn()
      );

      expect(mockAuthService.loginUser).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'testpass',
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        ok: true,
        user: {
          userId: 'user_456',
          username: 'testuser',
        },
      });
    });

    // Note: Validation and error handling tests removed - now handled by middleware
    // Service errors are now thrown as exceptions and handled by asyncHandler + errorHandler
  });

  describe('JSON Response Format', () => {
    it('should return valid JSON for successful registration', async () => {
      mockRequest.body = { username: 'testuser', password: 'testpassword123' };
      mockAuthService.registerUser.mockResolvedValue({
        userId: 'user_123',
        username: 'testuser',
      });

      await registerUser(
        mockRequest as Request,
        mockResponse as Response,
        jest.fn()
      );

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          user: expect.objectContaining({
            userId: expect.any(String),
            username: expect.any(String),
          }),
        })
      );
    });

    it('should return valid JSON for successful login', async () => {
      mockRequest.body = { username: 'testuser', password: 'testpass' };
      mockAuthService.loginUser.mockResolvedValue({
        userId: 'user_456',
        username: 'testuser',
      });

      await loginUser(
        mockRequest as Request,
        mockResponse as Response,
        jest.fn()
      );

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          user: expect.objectContaining({
            userId: expect.any(String),
            username: expect.any(String),
          }),
        })
      );
    });
  });
});
