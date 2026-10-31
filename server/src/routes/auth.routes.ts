import { Router } from 'express';
import { pool } from '../db/pool.js';
import {
  comparePassword,
  generateToken,
  hashPassword,
  validatePasswordPolicy,
} from '../utils/auth.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const userResult = await pool.query(
      'SELECT id, email, password_hash, role FROM users WHERE email = $1',
      [email.toLowerCase().trim()],
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userResult.rows[0];
    const passwordMatch = await comparePassword(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    let customerAccountId: string | null = null;
    let companyName: string | null = null;

    if (user.role === 'CUSTOMER') {
      const custResult = await pool.query(
        'SELECT id, company_name FROM customer_accounts WHERE user_id = $1',
        [user.id],
      );
      if (custResult.rows.length > 0) {
        customerAccountId = custResult.rows[0].id;
        companyName = custResult.rows[0].company_name;
      }
    }

    const authUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      customer_account_id: customerAccountId,
    };

    const token = generateToken(authUser);

    return res.json({
      token,
      user: {
        ...authUser,
        company_name: companyName,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticate, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, email, role, created_at FROM users WHERE id = $1',
      [req.user!.id],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    let customerAccount = null;

    if (user.role === 'CUSTOMER') {
      const custResult = await pool.query(
        'SELECT id, company_name, billing_address FROM customer_accounts WHERE user_id = $1',
        [user.id],
      );
      if (custResult.rows.length > 0) {
        customerAccount = custResult.rows[0];
      }
    }

    return res.json({
      user: {
        ...user,
        customer_account: customerAccount,
      },
    });
  } catch (err: any) {
    console.error('Auth me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/register-staff (ADMIN ONLY)
authRouter.post('/register-staff', authenticate, requireRole('ADMIN'), async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const policy = validatePasswordPolicy(password);
  if (!policy.valid) {
    return res.status(400).json({ error: policy.message });
  }

  try {
    const passwordHash = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role, created_by)
         VALUES ($1, $2, 'STAFF', $3)
         RETURNING id, email, role, created_by, created_at`,
      [email.toLowerCase().trim(), passwordHash, req.user!.id],
    );

    return res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('Register staff error:', err);
    return res.status(500).json({ error: 'Failed to create staff member' });
  }
});

// POST /api/auth/register-customer (ADMIN or STAFF)
authRouter.post(
  '/register-customer',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  async (req, res) => {
    const { email, password, company_name, billing_address } = req.body;
    if (!email || !password || !company_name) {
      return res.status(400).json({
        error: 'Email, password, and company_name are required',
      });
    }

    const policy = validatePasswordPolicy(password);
    if (!policy.valid) {
      return res.status(400).json({ error: policy.message });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const passwordHash = await hashPassword(password);
      const userRes = await client.query(
        `INSERT INTO users (email, password_hash, role, created_by)
         VALUES ($1, $2, 'CUSTOMER', $3)
         RETURNING id, email, role, created_at`,
        [email.toLowerCase().trim(), passwordHash, req.user!.id],
      );

      const userId = userRes.rows[0].id;

      const custRes = await client.query(
        `INSERT INTO customer_accounts (user_id, company_name, billing_address)
         VALUES ($1, $2, $3)
         RETURNING id, company_name, billing_address, created_at`,
        [userId, company_name.trim(), billing_address ? billing_address.trim() : null],
      );

      await client.query('COMMIT');

      return res.status(201).json({
        user: userRes.rows[0],
        customer_account: custRes.rows[0],
      });
    } catch (err: any) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Email already registered' });
      }
      console.error('Register customer error:', err);
      return res.status(500).json({ error: 'Failed to create customer' });
    } finally {
      client.release();
    }
  },
);

// GET /api/auth/users (ADMIN ONLY)
authRouter.get('/users', authenticate, requireRole('ADMIN'), async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.role, u.created_by, u.created_at,
                ca.id as customer_account_id, ca.company_name
         FROM users u
         LEFT JOIN customer_accounts ca ON u.id = ca.user_id
         ORDER BY u.created_at DESC`,
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Get users error:', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});
