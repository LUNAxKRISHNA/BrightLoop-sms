import { genSalt, hash, compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { AuthUser } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_hackathon_jwt_key_2026';

export function validatePasswordPolicy(password: string): {
  valid: boolean;
  message?: string;
} {
  if (password.length <= 8) {
    return {
      valid: false,
      message: 'Password must be greater than 8 characters',
    };
  }
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter',
    };
  }
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one lowercase letter',
    };
  }
  if (!/[-!@#$%^&*()_+=[\]{};':"\\|,.<>/?]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one special character',
    };
  }
  return { valid: true };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await genSalt(10);
  return hash(password, salt);
}

export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
  return compare(plain, hashed);
}

export function generateToken(payload: AuthUser): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, JWT_SECRET) as AuthUser;
}
