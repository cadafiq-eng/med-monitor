import { assertServerConfig, getSql } from './db.js';
import { verifyToken } from './auth.js';

function categoriaPA(sis, dia) {
  if (sis > 180 || dia > 120) return 'Crisis hipertensiva';
  if (sis >= 140 || dia >= 90) return 'Hipertensión 2';
  if (sis >= 130 || dia >= 80) return 'Hipertensión 1';
  if (sis >= 120 && dia < 80)  return 'Elevada';
  if (sis < 90  || dia < 60)  return 'Hipotensión';
  return 'Normal';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    assertServerConfig();
    const sql = getSql();

    // Migración: crear tabla si no existe
    await sql`
      CREATE TABLE IF NOT EXISTS presion_arterial (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        fecha      DATE NOT NULL,
        momento    TEXT,
        sistolica  INTEGER NOT NULL,
        diastolica INTEGER NOT NULL,
        frecuencia INTEGER,
        categoria  TEXT,
        notas      TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`;
    await sql`ALTER TABLE presion_arterial ADD COLUMN IF NOT EXISTS hora TIME`;

    const auth  = req.headers.authorization?.replace('Bearer ', '');
    const claim = verifyToken(auth || '');
    if (!claim) return res.status(401).json({ error: 'No autorizado' });
    const userId = claim.id;

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT * FROM presion_arterial
        WHERE user_id = ${userId}
        ORDER BY fecha DESC, created_at DESC`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { fecha, momento, hora, sistolica, diastolica, frecuencia, notas } = req.body;
      if (!fecha || !sistolica || !diastolica)
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      const categoria = categoriaPA(parseInt(sistolica), parseInt(diastolica));
      const [row] = await sql`
        INSERT INTO presion_arterial (user_id, fecha, momento, hora, sistolica, diastolica, frecuencia, categoria, notas)
        VALUES (${userId}, ${fecha}, ${momento || null}, ${hora || null}, ${parseInt(sistolica)}, ${parseInt(diastolica)},
                ${frecuencia ? parseInt(frecuencia) : null}, ${categoria}, ${notas || null})
        RETURNING *`;
      return res.status(201).json(row);
    }

    if (req.method === 'PUT') {
      const { id, fecha, momento, hora, sistolica, diastolica, frecuencia, notas } = req.body;
      if (!id || !fecha || !sistolica || !diastolica)
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      const categoria = categoriaPA(parseInt(sistolica), parseInt(diastolica));
      const [row] = await sql`
        UPDATE presion_arterial
        SET fecha = ${fecha}, momento = ${momento || null}, hora = ${hora || null},
            sistolica = ${parseInt(sistolica)}, diastolica = ${parseInt(diastolica)},
            frecuencia = ${frecuencia ? parseInt(frecuencia) : null},
            categoria = ${categoria}, notas = ${notas || null}
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *`;
      if (!row) return res.status(404).json({ error: 'Registro no encontrado' });
      return res.status(200).json(row);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      await sql`DELETE FROM presion_arterial WHERE id = ${id} AND user_id = ${userId}`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error interno' });
  }
}
