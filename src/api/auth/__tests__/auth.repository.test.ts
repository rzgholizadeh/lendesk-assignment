import { AuthRepository } from '../auth.repository';

describe('AuthRepository', () => {
  let authRepository: AuthRepository;
  let mockRedisClient: jest.Mocked<{
    multi: jest.Mock;
    exists: jest.Mock;
    hGetAll: jest.Mock;
    get: jest.Mock;
  }>;
  let mockMulti: jest.Mocked<{
    hSet: jest.Mock;
    set: jest.Mock;
    exec: jest.Mock;
  }>;

  beforeEach(() => {
    mockMulti = {
      hSet: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };

    mockRedisClient = {
      multi: jest.fn().mockReturnValue(mockMulti),
      get: jest.fn(),
      hGetAll: jest.fn(),
      exists: jest.fn(),
    };

    authRepository = new AuthRepository(mockRedisClient);

    jest.spyOn(require('uuid'), 'v4').mockReturnValue('test-uuid-123');
    jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('2023-01-01T00:00:00.000Z');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const userData = {
        username: 'testuser',
        passwordHash: 'hashedpassword123',
      };

      const result = await authRepository.createUser(userData);

      expect(mockRedisClient.multi).toHaveBeenCalled();
      expect(mockMulti.hSet).toHaveBeenCalledWith('user:test-uuid-123', {
        id: 'test-uuid-123',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      });
      expect(mockMulti.set).toHaveBeenCalledWith(
        'username:testuser',
        'test-uuid-123'
      );
      expect(mockMulti.exec).toHaveBeenCalled();

      expect(result).toEqual({
        id: 'test-uuid-123',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should handle Redis errors during user creation', async () => {
      const userData = {
        username: 'testuser',
        passwordHash: 'hashedpassword123',
      };

      mockMulti.exec.mockRejectedValue(new Error('Redis connection failed'));

      await expect(authRepository.createUser(userData)).rejects.toThrow(
        'Redis connection failed'
      );
    });
  });

  describe('findByUsername', () => {
    it('should find user by username successfully', async () => {
      const mockUser = {
        id: 'test-uuid-123',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      mockRedisClient.get.mockResolvedValue('test-uuid-123');
      mockRedisClient.hGetAll.mockResolvedValue(mockUser);

      const result = await authRepository.findByUsername('testuser');

      expect(mockRedisClient.get).toHaveBeenCalledWith('username:testuser');
      expect(mockRedisClient.hGetAll).toHaveBeenCalledWith(
        'user:test-uuid-123'
      );
      expect(result).toEqual({
        id: 'test-uuid-123',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      });
    });

    it('should return null when username does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await authRepository.findByUsername('nonexistent');

      expect(mockRedisClient.get).toHaveBeenCalledWith('username:nonexistent');
      expect(mockRedisClient.hGetAll).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null when user ID exists but user data does not', async () => {
      mockRedisClient.get.mockResolvedValue('test-uuid-123');
      mockRedisClient.hGetAll.mockResolvedValue({});

      const result = await authRepository.findByUsername('testuser');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by ID successfully', async () => {
      const mockUser = {
        id: 'test-uuid-123',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      mockRedisClient.hGetAll.mockResolvedValue(mockUser);

      const result = await authRepository.findById('test-uuid-123');

      expect(mockRedisClient.hGetAll).toHaveBeenCalledWith(
        'user:test-uuid-123'
      );
      expect(result).toEqual({
        id: 'test-uuid-123',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      });
    });

    it('should return null when user does not exist', async () => {
      mockRedisClient.hGetAll.mockResolvedValue({});

      const result = await authRepository.findById('nonexistent-id');

      expect(mockRedisClient.hGetAll).toHaveBeenCalledWith(
        'user:nonexistent-id'
      );
      expect(result).toBeNull();
    });

    it('should return null when hGetAll returns null', async () => {
      mockRedisClient.hGetAll.mockResolvedValue(null);

      const result = await authRepository.findById('test-uuid-123');

      expect(result).toBeNull();
    });
  });

  describe('userExists', () => {
    it('should return true when user exists', async () => {
      mockRedisClient.get.mockResolvedValue('test-uuid-123');

      const result = await authRepository.userExists('testuser');

      expect(mockRedisClient.get).toHaveBeenCalledWith('username:testuser');
      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await authRepository.userExists('nonexistent');

      expect(mockRedisClient.get).toHaveBeenCalledWith('username:nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('private methods', () => {
    it('should generate correct user key', () => {
      const key = (
        authRepository as unknown as { getUserKey: (id: string) => string }
      ).getUserKey('test-id');
      expect(key).toBe('user:test-id');
    });

    it('should generate correct username index key', () => {
      const key = (
        authRepository as unknown as {
          getUsernameIndexKey: (username: string) => string;
        }
      ).getUsernameIndexKey('testuser');
      expect(key).toBe('username:testuser');
    });
  });
});
