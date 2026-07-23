import { neon } from '@neondatabase/serverless';

let sql;

export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Falta configurar DATABASE_URL en Vercel.');
  }

  if (!sql) {
    sql = neon(process.env.DATABASE_URL);
  }

  return sql;
}

export function assertServerConfig() {
  const missing = ['DATABASE_URL', 'JWT_SECRET', 'SALT'].filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Faltan variables en Vercel: ${missing.join(', ')}`);
  }
}
