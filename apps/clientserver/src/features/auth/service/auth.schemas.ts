import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const SignupSchema = LoginSchema.extend({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type SignupInput = z.infer<typeof SignupSchema>;
