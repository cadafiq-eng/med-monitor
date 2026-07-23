import { assertServerConfig, getSql } from './db.js';
import crypto from 'crypto';

function hash(password) {
  return crypto.createHash('sha256').update(password + process.env.SALT).digest('hex');
}

function makeToken(userId) {
  const payload = Buffer.from(JSON.stringify({ id: userId, ts: Date.now() })).toString('base64');
  const sig     = crypto.createHmac('sha256', process.env.JWT_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyToken(token) {
  try {
    const [payload, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', process.env.JWT_SECRET).update(payload).digest('hex');
    if (sig !== expected) return null;
    return JSON.parse(Buffer.from(payload, 'base64').toString());
  } catch { return null; }
}

async function ensureTables(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS usuarios (
      id         SERIAL PRIMARY KEY,
      email      TEXT UNIQUE NOT NULL,
      password   TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS medicamentos (
      id               SERIAL PRIMARY KEY,
      user_id          INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
      nombre           TEXT NOT NULL,
      stock            NUMERIC DEFAULT 0,
      consumo_diario   NUMERIC DEFAULT 1,
      consumo_variable BOOLEAN DEFAULT FALSE,
      tomas            INTEGER DEFAULT 1,
      dias_aviso       INTEGER DEFAULT 10,
      fecha_inicio     DATE,
      dias_recetados   INTEGER,
      historial        JSONB DEFAULT '[]',
      created_at       TIMESTAMPTZ DEFAULT NOW()
    )`;
  await sql`ALTER TABLE medicamentos ADD COLUMN IF NOT EXISTS consumo_variable BOOLEAN DEFAULT FALSE`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { action, email, password, new_password } = req.body || {};

  try {
    assertServerConfig();
    const sql = getSql();
    await ensureTables(sql);

    if (action === 'register') {
      const exists = await sql`SELECT id FROM usuarios WHERE email = ${email}`;
      if (exists.length > 0) return res.status(400).json({ error: 'El correo ya está registrado' });
      const [user] = await sql`
        INSERT INTO usuarios (email, password) VALUES (${email}, ${hash(password)}) RETURNING id, email`;
      return res.status(200).json({ token: makeToken(user.id), user: { id: user.id, email: user.email } });
    }

    if (action === 'login') {
      const [user] = await sql`SELECT id, email FROM usuarios WHERE email = ${email} AND password = ${hash(password)}`;
      if (!user) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
      return res.status(200).json({ token: makeToken(user.id), user: { id: user.id, email: user.email } });
    }

    if (action === 'change-password') {
      const authHeader = req.headers.authorization?.replace('Bearer ', '');
      const claim = verifyToken(authHeader || '');
      if (!claim) return res.status(401).json({ error: 'Sesión no válida' });
      if (!password || !new_password) return res.status(400).json({ error: 'Faltan campos' });
      if (new_password.length < 4) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 4 caracteres' });
      const [user] = await sql`SELECT id FROM usuarios WHERE id = ${claim.id} AND password = ${hash(password)}`;
      if (!user) return res.status(401).json({ error: 'Contraseña actual incorrecta' });
      await sql`UPDATE usuarios SET password = ${hash(new_password)} WHERE id = ${claim.id}`;
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Acción no válida' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
