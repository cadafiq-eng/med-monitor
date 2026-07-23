import { assertServerConfig, getSql } from './db.js';
import { verifyToken } from './auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    assertServerConfig();
    const sql = getSql();
    // Migraciones: asegura columnas nuevas
    await sql`ALTER TABLE medicamentos ADD COLUMN IF NOT EXISTS consumo_variable BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE medicamentos ADD COLUMN IF NOT EXISTS unidades TEXT DEFAULT 'pastillas'`;

    const auth  = req.headers.authorization?.replace('Bearer ', '');
    const claim = verifyToken(auth || '');
    if (!claim) return res.status(401).json({ error: 'No autorizado' });
    const userId = claim.id;

    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM medicamentos WHERE user_id = ${userId} ORDER BY created_at`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { nombre, stock, consumo_diario, consumo_variable, tomas, dias_aviso, fecha_inicio, dias_recetados, unidades } = req.body;
      const [row] = await sql`
        INSERT INTO medicamentos (user_id, nombre, stock, consumo_diario, consumo_variable, tomas, dias_aviso, fecha_inicio, dias_recetados, unidades)
        VALUES (${userId}, ${nombre}, ${stock}, ${consumo_diario}, ${!!consumo_variable}, ${tomas}, ${dias_aviso}, ${fecha_inicio}, ${dias_recetados}, ${unidades || 'pastillas'})
        RETURNING *`;
      return res.status(201).json(row);
    }

    if (req.method === 'PATCH') {
      const { id, ...campos } = req.body;
      const allowed = ['nombre','stock','consumo_diario','consumo_variable','tomas','dias_aviso','fecha_inicio','dias_recetados','historial','unidades'];
      const filtered = Object.fromEntries(Object.entries(campos).filter(([k]) => allowed.includes(k)));
      if (!id || Object.keys(filtered).length === 0) return res.status(400).json({ error: 'Datos incompletos' });

      if (filtered.historial !== undefined) {
        await sql`UPDATE medicamentos SET historial = ${JSON.stringify(filtered.historial)}::jsonb WHERE id = ${id} AND user_id = ${userId}`;
        filtered.historial = undefined;
      }

      const keys = Object.keys(filtered).filter(k => filtered[k] !== undefined);
      for (const k of keys) {
        if (k === 'nombre') await sql`UPDATE medicamentos SET nombre = ${filtered[k]} WHERE id = ${id} AND user_id = ${userId}`;
        if (k === 'stock') await sql`UPDATE medicamentos SET stock = ${filtered[k]} WHERE id = ${id} AND user_id = ${userId}`;
        if (k === 'consumo_diario') await sql`UPDATE medicamentos SET consumo_diario = ${filtered[k]} WHERE id = ${id} AND user_id = ${userId}`;
        if (k === 'consumo_variable') await sql`UPDATE medicamentos SET consumo_variable = ${!!filtered[k]} WHERE id = ${id} AND user_id = ${userId}`;
        if (k === 'tomas') await sql`UPDATE medicamentos SET tomas = ${filtered[k]} WHERE id = ${id} AND user_id = ${userId}`;
        if (k === 'dias_aviso') await sql`UPDATE medicamentos SET dias_aviso = ${filtered[k]} WHERE id = ${id} AND user_id = ${userId}`;
        if (k === 'fecha_inicio') await sql`UPDATE medicamentos SET fecha_inicio = ${filtered[k]} WHERE id = ${id} AND user_id = ${userId}`;
        if (k === 'dias_recetados') await sql`UPDATE medicamentos SET dias_recetados = ${filtered[k]} WHERE id = ${id} AND user_id = ${userId}`;
        if (k === 'unidades') await sql`UPDATE medicamentos SET unidades = ${filtered[k]} WHERE id = ${id} AND user_id = ${userId}`;
      }

      const [row] = await sql`SELECT * FROM medicamentos WHERE id = ${id} AND user_id = ${userId}`;
      return res.status(200).json(row);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      await sql`DELETE FROM medicamentos WHERE id = ${id} AND user_id = ${userId}`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error interno' });
  }
}
