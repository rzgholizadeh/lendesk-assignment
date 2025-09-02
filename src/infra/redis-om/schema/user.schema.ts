import { Schema } from 'redis-om';

export const userSchema = new Schema('User', {
  username: { type: 'string' },
  passwordHash: { type: 'string' },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
});
