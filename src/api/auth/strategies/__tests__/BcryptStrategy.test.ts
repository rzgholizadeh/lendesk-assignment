import bcrypt from 'bcrypt';
import { BcryptStrategy } from '../BcryptStrategy';

jest.mock('bcrypt');

describe('BcryptStrategy', () => {
  let bcryptStrategy: BcryptStrategy;
  let mockBcrypt: jest.Mocked<typeof bcrypt>;

  beforeEach(() => {
    mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
    bcryptStrategy = new BcryptStrategy(12);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hash', () => {
    it('should hash password with correct salt rounds', async () => {
      const password = 'testpassword123';
      const expectedHash = 'hashedpassword123';

      mockBcrypt.hash.mockResolvedValue(expectedHash as never);

      const result = await bcryptStrategy.hash(password);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(expectedHash);
    });

    it('should propagate bcrypt hash errors', async () => {
      const password = 'testpassword123';
      const error = new Error('Bcrypt hash failed');

      mockBcrypt.hash.mockRejectedValue(error as never);

      await expect(bcryptStrategy.hash(password)).rejects.toThrow(
        'Bcrypt hash failed'
      );
    });
  });

  describe('verify', () => {
    it('should verify correct password returns true', async () => {
      const password = 'testpassword123';
      const hash = 'hashedpassword123';

      mockBcrypt.compare.mockResolvedValue(true as never);

      const result = await bcryptStrategy.verify(password, hash);

      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(true);
    });

    it('should verify incorrect password returns false', async () => {
      const password = 'wrongpassword';
      const hash = 'hashedpassword123';

      mockBcrypt.compare.mockResolvedValue(false as never);

      const result = await bcryptStrategy.verify(password, hash);

      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(false);
    });

    it('should propagate bcrypt compare errors', async () => {
      const password = 'testpassword123';
      const hash = 'hashedpassword123';
      const error = new Error('Bcrypt compare failed');

      mockBcrypt.compare.mockRejectedValue(error as never);

      await expect(bcryptStrategy.verify(password, hash)).rejects.toThrow(
        'Bcrypt compare failed'
      );
    });
  });

  describe('constructor', () => {
    it('should accept different salt rounds', async () => {
      const strategy = new BcryptStrategy(10);
      const password = 'testpassword123';

      mockBcrypt.hash.mockResolvedValue('hash' as never);

      await strategy.hash(password);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 10);
    });
  });
});
