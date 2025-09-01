export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  username: string;
  password: string;
}

export interface UserCredentials {
  username: string;
  password: string;
}

export interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}
