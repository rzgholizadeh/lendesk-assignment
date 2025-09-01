import { z } from 'zod';

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters long')
    .max(50, 'Username must not exceed 50 characters')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Username can only contain letters, numbers, and underscores'
    )
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password must not exceed 100 characters'),
});

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').trim(),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;

export const registerResponseSchema = z.object({
  message: z.string(),
  userId: z.string(),
});

export const loginResponseSchema = z.object({
  message: z.string(),
  userId: z.string(),
});

export const errorResponseSchema = z.object({
  error: z.string(),
});

export type RegisterResponse = z.infer<typeof registerResponseSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
