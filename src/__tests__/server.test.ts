import request from 'supertest';
import { createApp } from '../server';
import { IAuthService } from '../api/auth/auth.service';

describe('Server - createApp', () => {
  let app: ReturnType<typeof createApp>;
  let mockAuthService: jest.Mocked<IAuthService>;

  beforeEach(() => {
    mockAuthService = {
      registerUser: jest.fn(),
      loginUser: jest.fn(),
    };

    app = createApp({ authService: mockAuthService });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /health', () => {
    it('should return health check status', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should handle registration request', async () => {
      mockAuthService.registerUser.mockResolvedValue({
        success: true,
        data: {
          userId: 'test-uuid-123',
          username: 'testuser',
        },
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'testuser',
          password: 'password123',
        })
        .expect(201);

      expect(response.body).toEqual({
        message: 'User registered successfully',
        userId: 'test-uuid-123',
      });

      expect(mockAuthService.registerUser).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      });
    });

    it('should handle invalid JSON body', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(mockAuthService.registerUser).not.toHaveBeenCalled();
    });

    it('should handle missing content-type header', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('Content-Type', 'text/plain')
        .send('{"username":"test","password":"test"}')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(mockAuthService.registerUser).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should handle login request', async () => {
      mockAuthService.loginUser.mockResolvedValue({
        success: true,
        data: {
          userId: 'test-uuid-123',
          username: 'testuser',
        },
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toEqual({
        message: 'Login successful',
        userId: 'test-uuid-123',
      });

      expect(mockAuthService.loginUser).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      });
    });

    it('should handle authentication failure', async () => {
      mockAuthService.loginUser.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toEqual({
        error: 'Invalid credentials',
      });

      expect(mockAuthService.loginUser).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'wrongpassword',
      });
    });
  });

  describe('Express middleware', () => {
    it('should parse JSON bodies correctly', async () => {
      mockAuthService.registerUser.mockResolvedValue({
        success: true,
        data: {
          userId: 'test-uuid-123',
          username: 'testuser',
        },
      });

      await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'testuser',
          password: 'password123',
        })
        .expect(201);

      expect(mockAuthService.registerUser).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      });
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
      expect(mockAuthService.registerUser).not.toHaveBeenCalled();
    });
  });

  describe('Route not found', () => {
    it('should return 404 for unknown routes', async () => {
      await request(app).get('/unknown-route').expect(404);
    });

    it('should return 404 for unknown POST routes', async () => {
      await request(app).post('/unknown-route').expect(404);
    });
  });
});
