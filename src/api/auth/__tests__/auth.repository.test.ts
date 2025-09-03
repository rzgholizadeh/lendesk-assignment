import { AuthRepository } from '../auth.repository';
import { User } from '../auth.model';
import { DuplicateKeyError } from '../auth.errors';

describe('AuthRepository', () => {
  let authRepository: AuthRepository;
  let mockRedisClient: jest.Mocked<{
    saveUser: jest.Mock;
    getUserByKey: jest.Mock;
    saveUserWithIndex: jest.Mock;
    saveUserWithUniqueIndex: jest.Mock;
    getUserIdByIndex: jest.Mock;
    connect: jest.Mock;
    disconnect: jest.Mock;
    quit: jest.Mock;
  }>;

  beforeEach(() => {
    mockRedisClient = {
      saveUser: jest.fn(),
      getUserByKey: jest.fn(),
      saveUserWithIndex: jest.fn(),
      saveUserWithUniqueIndex: jest.fn(),
      getUserIdByIndex: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      quit: jest.fn(),
    };

    authRepository = new AuthRepository(mockRedisClient);

    jest.spyOn(require('uuid'), 'v4').mockReturnValue('test-uuid-123');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const expectedUser: User = {
        id: 'test-uuid-123',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      };

      mockRedisClient.saveUserWithUniqueIndex.mockResolvedValue({
        success: true,
        user: expectedUser,
      });

      const result = await authRepository.createUser(
        'testuser',
        'hashedpassword123'
      );

      expect(mockRedisClient.saveUserWithUniqueIndex).toHaveBeenCalledWith(
        'user:test-uuid-123',
        'username:testuser',
        {
          id: 'test-uuid-123',
          username: 'testuser',
          passwordHash: 'hashedpassword123',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }
      );

      expect(result).toEqual(expectedUser);
    });

    it('should throw DuplicateKeyError when username already exists', async () => {
      mockRedisClient.saveUserWithUniqueIndex.mockResolvedValue({
        success: false,
        user: undefined,
      });

      await expect(
        authRepository.createUser('testuser', 'hashedpassword123')
      ).rejects.toThrow(DuplicateKeyError);

      await expect(
        authRepository.createUser('testuser', 'hashedpassword123')
      ).rejects.toThrow('Username already exists');
    });

    it('should handle Redis errors during user creation', async () => {
      mockRedisClient.saveUserWithUniqueIndex.mockRejectedValue(
        new Error('Redis connection failed')
      );

      await expect(
        authRepository.createUser('testuser', 'hashedpassword123')
      ).rejects.toThrow('Redis connection failed');
    });
  });

  describe('findByUsername', () => {
    it('should find user by username successfully', async () => {
      const mockUser: User = {
        id: 'test-uuid-123',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      };

      mockRedisClient.getUserIdByIndex.mockResolvedValue('test-uuid-123');
      mockRedisClient.getUserByKey.mockResolvedValue(mockUser);

      const result = await authRepository.findByUsername('testuser');

      expect(mockRedisClient.getUserIdByIndex).toHaveBeenCalledWith(
        'username:testuser'
      );
      expect(mockRedisClient.getUserByKey).toHaveBeenCalledWith(
        'user:test-uuid-123'
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when username does not exist', async () => {
      mockRedisClient.getUserIdByIndex.mockResolvedValue(null);

      const result = await authRepository.findByUsername('nonexistent');

      expect(mockRedisClient.getUserIdByIndex).toHaveBeenCalledWith(
        'username:nonexistent'
      );
      expect(mockRedisClient.getUserByKey).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null when user ID exists but user data does not', async () => {
      mockRedisClient.getUserIdByIndex.mockResolvedValue('test-uuid-123');
      mockRedisClient.getUserByKey.mockResolvedValue(null);

      const result = await authRepository.findByUsername('testuser');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by ID successfully', async () => {
      const mockUser: User = {
        id: 'test-uuid-123',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      };

      mockRedisClient.getUserByKey.mockResolvedValue(mockUser);

      const result = await authRepository.findById('test-uuid-123');

      expect(mockRedisClient.getUserByKey).toHaveBeenCalledWith(
        'user:test-uuid-123'
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when user does not exist', async () => {
      mockRedisClient.getUserByKey.mockResolvedValue(null);

      const result = await authRepository.findById('nonexistent-id');

      expect(mockRedisClient.getUserByKey).toHaveBeenCalledWith(
        'user:nonexistent-id'
      );
      expect(result).toBeNull();
    });
  });

  describe('userExists', () => {
    it('should return true when user exists', async () => {
      mockRedisClient.getUserIdByIndex.mockResolvedValue('test-uuid-123');

      const result = await authRepository.userExists('testuser');

      expect(mockRedisClient.getUserIdByIndex).toHaveBeenCalledWith(
        'username:testuser'
      );
      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      mockRedisClient.getUserIdByIndex.mockResolvedValue(null);

      const result = await authRepository.userExists('nonexistent');

      expect(mockRedisClient.getUserIdByIndex).toHaveBeenCalledWith(
        'username:nonexistent'
      );
      expect(result).toBe(false);
    });
  });

  describe('key generation', () => {
    it('should generate correct keys for user operations', async () => {
      mockRedisClient.getUserIdByIndex.mockResolvedValue('test-id');
      mockRedisClient.getUserByKey.mockResolvedValue({
        id: 'test-id',
        username: 'testuser',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await authRepository.findByUsername('testuser');

      expect(mockRedisClient.getUserIdByIndex).toHaveBeenCalledWith(
        'username:testuser'
      );
      expect(mockRedisClient.getUserByKey).toHaveBeenCalledWith('user:test-id');
    });
  });
});
