import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router, type NextFunction, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import type { user_role } from '@prisma/client';
import { prisma } from './db.js';

export type AuthUser = { id: string; email: string; role: user_role };

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

const secret = () => {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error('JWT_SECRET is not set');
  return value;
};

// PRD 4.1, same rules as client/src/lib/auth-schemas.ts.
export const isStrongPassword = (p: string) =>
  p.length >= 9 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[^A-Za-z0-9]/.test(p);

/** Hash for accounts created by an admin; they set a real password through "forgot password". */
export const randomPasswordHash = () => bcrypt.hash(randomBytes(24).toString('hex'), 10);

export const hashPassword = (password: string) => bcrypt.hash(password, 10);

const sign = (user: AuthUser) => jwt.sign(user, secret(), { expiresIn: '12h' });

/** Requires a valid bearer token, optionally with one of `roles`. */
export function requireAuth(...roles: user_role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    try {
      const user = jwt.verify(token ?? '', secret()) as AuthUser;
      if (roles.length && !roles.includes(user.role)) {
        return res.status(403).json({ error: "You don't have access to this." });
      }
      req.user = { id: user.id, email: user.email, role: user.role };
      next();
    } catch {
      res.status(401).json({ error: 'Your session has ended. Sign in again.' });
    }
  };
}

export const auth = Router();

auth.post('/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  const user = await prisma.users.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  if (!user.is_active) return res.status(403).json({ error: 'This account has been deactivated.' });
  const session = { id: user.id, email: user.email, role: user.role };
  res.json({ token: sign(session), user: session });
});

/** Customer self sign-up: a CUSTOMER user plus its customer account. */
auth.post('/signup', async (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  if (!name || !email) return res.status(400).json({ error: 'Enter your name and email.' });
  if (!isStrongPassword(password)) return res.status(400).json({ error: 'Password does not meet all the rules.' });
  if (await prisma.users.findUnique({ where: { email } })) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }
  const user = await prisma.users.create({
    data: {
      email,
      role: 'CUSTOMER',
      full_name: name,
      password_hash: await hashPassword(password),
      customer_accounts: { create: { company_name: name } },
    },
  });
  res.status(201).json({ email: user.email });
});

/** Stores a reset token. Sending the email is not built yet, so the response is the same either way. */
auth.post('/forgot-password', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const user = await prisma.users.findUnique({ where: { email } });
  if (user) {
    await prisma.users.update({
      where: { id: user.id },
      data: { reset_token: randomBytes(32).toString('hex'), reset_token_expires_at: new Date(Date.now() + 3_600_000) },
    });
  }
  res.json({ ok: true });
});

auth.post('/change-password', requireAuth(), async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  const user = await prisma.users.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (!(await bcrypt.compare(String(currentPassword ?? ''), user.password_hash))) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }
  if (!isStrongPassword(String(newPassword ?? ''))) {
    return res.status(400).json({ error: 'Password does not meet all the rules.' });
  }
  await prisma.users.update({ where: { id: user.id }, data: { password_hash: await hashPassword(newPassword) } });
  res.json({ ok: true });
});
