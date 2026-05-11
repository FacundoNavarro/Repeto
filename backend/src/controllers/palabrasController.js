const pool = require('../db/pool');

async function listar(req, res) {
  const { categoria_id } = req.query;

  let query = `
    SELECT p.*, c.nombre AS categoria_nombre, c.color AS categoria_color
    FROM palabra p
    JOIN categoria c ON c.id = p.categoria_id
  `;
  const params = [];

  if (categoria_id) {
    query += ' WHERE p.categoria_id = $1';
    params.push(categoria_id);
  }

  query += ' ORDER BY p.palabra';

  const { rows } = await pool.query(query, params);
  res.json(rows);
}

async function obtener(req, res) {
  const { rows } = await pool.query(
    `SELECT p.*, c.nombre AS categoria_nombre, c.color AS categoria_color
     FROM palabra p
     JOIN categoria c ON c.id = p.categoria_id
     WHERE p.id = $1`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Palabra no encontrada' });
  res.json(rows[0]);
}

async function crear(req, res) {
  const { palabra, traduccion, ejemplo_uso, categoria_id, dificultad_base } = req.body;

  if (!palabra || !traduccion || !categoria_id) {
    return res.status(400).json({ error: 'palabra, traduccion y categoria_id son requeridos' });
  }

  const { rows } = await pool.query(
    `INSERT INTO palabra (palabra, traduccion, ejemplo_uso, categoria_id, dificultad_base)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [palabra, traduccion, ejemplo_uso ?? null, categoria_id, dificultad_base ?? 1]
  );
  res.status(201).json(rows[0]);
}

async function actualizar(req, res) {
  const { palabra, traduccion, ejemplo_uso, categoria_id, dificultad_base } = req.body;

  const { rows } = await pool.query(
    `UPDATE palabra
     SET palabra        = COALESCE($1, palabra),
         traduccion     = COALESCE($2, traduccion),
         ejemplo_uso    = COALESCE($3, ejemplo_uso),
         categoria_id   = COALESCE($4, categoria_id),
         dificultad_base = COALESCE($5, dificultad_base)
     WHERE id = $6
     RETURNING *`,
    [palabra ?? null, traduccion ?? null, ejemplo_uso ?? null,
     categoria_id ?? null, dificultad_base ?? null, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Palabra no encontrada' });
  res.json(rows[0]);
}

async function eliminar(req, res) {
  const { rowCount } = await pool.query('DELETE FROM palabra WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Palabra no encontrada' });
  res.status(204).send();
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
