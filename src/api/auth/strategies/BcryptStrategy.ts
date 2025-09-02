import bcrypt from 'bcrypt';
import { IPasswordStrategy } from './IPasswordStrategy';

export class BcryptStrategy implements IPasswordStrategy {
  constructor(private readonly saltRounds: number) {}

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
