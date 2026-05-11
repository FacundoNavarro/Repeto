const pool = require('../db/pool');

async function listar(req, res) {
  const { rows } = await pool.query('SELECT * FROM categoria ORDER BY nombre');
  res.json(rows);
}

async function obtener(req, res) {
  const { rows } = await pool.query('SELECT * FROM categoria WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Categoría no encontrada' });
  res.json(rows[0]);
}

async function crear(req, res) {
  const { nombre, descripcion, color } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });

  const { rows } = await pool.query(
    'INSERT INTO categoria (nombre, descripcion, color) VALUES ($1, $2, $3) RETURNING *',
    [nombre, descripcion ?? null, color ?? null]
  );
  res.status(201).json(rows[0]);
}

async function actualizar(req, res) {
  const { nombre, descripcion, color } = req.body;
  const { rows } = await pool.query(
    `UPDATE categoria
     SET nombre = COALESCE($1, nombre),
         descripcion = COALESCE($2, descripcion),
         color = COALESCE($3, color)
     WHERE id = $4
     RETURNING *`,
    [nombre ?? null, descripcion ?? null, color ?? null, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Categoría no encontrada' });
  res.json(rows[0]);
}

async function eliminar(req, res) {
  const { rowCount } = await pool.query('DELETE FROM categoria WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Categoría no encontrada' });
  res.status(204).send();
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
