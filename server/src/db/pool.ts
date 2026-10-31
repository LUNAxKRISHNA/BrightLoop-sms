import { Pool } from 'pg';
import 'dotenv/config';

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://admin:CHANGE_ME@localhost:5432/brightloop_sms',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});
