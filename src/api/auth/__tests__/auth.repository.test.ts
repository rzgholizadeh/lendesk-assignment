import { AuthRepository } from '../auth.repository';
import { Repository } from 'redis-om';

describe('AuthRepository', () => {
  let authRepository: AuthRepository;
  let mockRepository: Partial<Repository>;

  beforeEach(() => {
    // Create mock Repository with proper typing
    mockRepository = {
      save: jest.fn(),
      fetch: jest.fn(),
      search: jest.fn(),
    };

    authRepository = new AuthRepository(mockRepository as Repository);
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

      const mockSavedUser = {
        entityId: 'test-entity-id',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      };

      (mockRepository.save as jest.Mock).mockResolvedValue(mockSavedUser);

      const result = await authRepository.createUser(userData);

      expect((mockRepository.save as jest.Mock)).toHaveBeenCalledWith({
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      expect(result).toEqual({
        id: 'test-entity-id',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should throw error when entityId is not returned', async () => {
      const userData = {
        username: 'testuser',
        passwordHash: 'hashedpassword123',
      };

      const mockSavedUser = {
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        createdAt: new Date(),
        updatedAt: new Date(),
        // Missing entityId
      };

      (mockRepository.save as jest.Mock).mockResolvedValue(mockSavedUser);

      await expect(authRepository.createUser(userData)).rejects.toThrow(
        'Failed to create user: No entityId returned'
      );
    });

    it('should handle Redis OM errors during user creation', async () => {
      const userData = {
        username: 'testuser',
        passwordHash: 'hashedpassword123',
      };

      (mockRepository.save as jest.Mock).mockRejectedValue(new Error('Redis OM save failed'));

      await expect(authRepository.createUser(userData)).rejects.toThrow(
        'Redis OM save failed'
      );
    });
  });

  describe('findByUsername', () => {
    it('should find user by username successfully', async () => {
      const mockFoundUser = {
        entityId: 'test-entity-id',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      };

      const mockSearchChain = {
        where: jest.fn().mockReturnValue({
          equals: jest.fn().mockReturnValue({
            return: {
              first: jest.fn().mockResolvedValue(mockFoundUser),
            },
          }),
        }),
      } as any;

      (mockRepository.search as jest.Mock).mockReturnValue(mockSearchChain);

      const result = await authRepository.findByUsername('testuser');

      expect((mockRepository.search as jest.Mock)).toHaveBeenCalled();
      expect(mockSearchChain.where).toHaveBeenCalledWith('username');
      expect(mockSearchChain.where().equals).toHaveBeenCalledWith('testuser');

      expect(result).toEqual({
        id: 'test-entity-id',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      });
    });

    it('should return null when username does not exist', async () => {
      const mockSearchChain = {
        where: jest.fn().mockReturnValue({
          equals: jest.fn().mockReturnValue({
            return: {
              first: jest.fn().mockResolvedValue(null),
            },
          }),
        }),
      } as any;

      (mockRepository.search as jest.Mock).mockReturnValue(mockSearchChain);

      const result = await authRepository.findByUsername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by ID successfully', async () => {
      const mockFoundUser = {
        entityId: 'test-entity-id',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      };

      (mockRepository.fetch as jest.Mock).mockResolvedValue(mockFoundUser as any);

      const result = await authRepository.findById('test-entity-id');

      expect((mockRepository.fetch as jest.Mock)).toHaveBeenCalledWith('test-entity-id');
      expect(result).toEqual({
        id: 'test-entity-id',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      });
    });

    it('should return null when user does not exist', async () => {
      (mockRepository.fetch as jest.Mock).mockResolvedValue(null as any);

      const result = await authRepository.findById('nonexistent-id');

      expect((mockRepository.fetch as jest.Mock)).toHaveBeenCalledWith('nonexistent-id');
      expect(result).toBeNull();
    });

    it('should return null when fetch returns user without entityId', async () => {
      const mockFoundUser = {
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        createdAt: new Date(),
        updatedAt: new Date(),
        // Missing entityId
      };

      (mockRepository.fetch as jest.Mock).mockResolvedValue(mockFoundUser as any);

      const result = await authRepository.findById('test-entity-id');

      expect(result).toBeNull();
    });
  });

  describe('userExists', () => {
    it('should return true when user exists', async () => {
      const mockFoundUser = {
        entityId: 'test-entity-id',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSearchChain = {
        where: jest.fn().mockReturnValue({
          equals: jest.fn().mockReturnValue({
            return: {
              first: jest.fn().mockResolvedValue(mockFoundUser),
            },
          }),
        }),
      } as any;

      (mockRepository.search as jest.Mock).mockReturnValue(mockSearchChain);

      const result = await authRepository.userExists('testuser');

      expect((mockRepository.search as jest.Mock)).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      const mockSearchChain = {
        where: jest.fn().mockReturnValue({
          equals: jest.fn().mockReturnValue({
            return: {
              first: jest.fn().mockResolvedValue(null),
            },
          }),
        }),
      } as any;

      (mockRepository.search as jest.Mock).mockReturnValue(mockSearchChain);

      const result = await authRepository.userExists('nonexistent');

      expect(result).toBe(false);
    });

    it('should return false when user exists but has no entityId', async () => {
      const mockFoundUser = {
        username: 'testuser',
        // Missing entityId
      };

      const mockSearchChain = {
        where: jest.fn().mockReturnValue({
          equals: jest.fn().mockReturnValue({
            return: {
              first: jest.fn().mockResolvedValue(mockFoundUser),
            },
          }),
        }),
      } as any;

      (mockRepository.search as jest.Mock).mockReturnValue(mockSearchChain);

      const result = await authRepository.userExists('testuser');

      expect(result).toBe(false);
    });
  });
});