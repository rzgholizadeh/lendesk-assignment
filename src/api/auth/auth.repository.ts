import { User } from './auth.model';
import { Repository } from 'redis-om';

export interface IAuthRepository {
  createUser(userData: { username: string; passwordHash: string }): Promise<User>;
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  userExists(username: string): Promise<boolean>;
}

export class AuthRepository implements IAuthRepository {
  constructor(private userRepository: Repository) { }

  public async createUser(
    userData: { username: string; passwordHash: string }
  ): Promise<User> {
    const now = new Date();

    const savedUser = await this.userRepository.save({
      username: userData.username,
      passwordHash: userData.passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    if (!savedUser.entityId) {
      throw new Error('Failed to create user: No entityId returned');
    }

    return {
      id: savedUser.entityId,
      username: savedUser.username,
      passwordHash: savedUser.passwordHash,
      createdAt: savedUser.createdAt,
      updatedAt: savedUser.updatedAt,
    };
  }

  public async findByUsername(username: string): Promise<User | null> {
    const foundUser = await this.userRepository.search()
      .where('username').equals(username)
      .return.first();

    if (!foundUser) {
      return null;
    }

    return {
      id: foundUser.entityId,
      username: foundUser.username,
      passwordHash: foundUser.passwordHash,
      createdAt: foundUser.createdAt,
      updatedAt: foundUser.updatedAt,
    };
  }

  public async findById(id: string): Promise<User | null> {
    const foundUser = await this.userRepository.fetch(id);

    if (!foundUser || !foundUser.entityId) {
      return null;
    }

    return {
      id: foundUser.entityId,
      username: foundUser.username,
      passwordHash: foundUser.passwordHash,
      createdAt: foundUser.createdAt,
      updatedAt: foundUser.updatedAt,
    };
  }

  public async userExists(username: string): Promise<boolean> {
    const foundUser = await this.userRepository.search()
      .where('username').equals(username)
      .return.first();

    return foundUser !== null && foundUser.entityId !== undefined;
  }

}
