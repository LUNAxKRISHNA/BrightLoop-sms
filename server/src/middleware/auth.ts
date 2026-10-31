import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth.js';
import type { AuthUser, UserRole } from '../types/index.js';
import { pool } from '../db/pool.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);

    // If CUSTOMER and customer_account_id is not cached in token, fetch it from DB
    if (decoded.role === 'CUSTOMER' && !decoded.customer_account_id) {
      const custRes = await pool.query(
        'SELECT id FROM customer_accounts WHERE user_id = $1 LIMIT 1',
        [decoded.id],
      );
      if (custRes.rows.length > 0) {
        decoded.customer_account_id = custRes.rows[0].id;
      }
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: role '${req.user.role}' is not authorized. Required: ${allowedRoles.join(', ')}`,
      });
    }
    next();
  };
}
