const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

async function registro(req, res) {
  const { email, nombre, password } = req.body;
  if (!email || !nombre || !password) {
    return res.status(400).json({ error: 'email, nombre y password son requeridos' });
  }

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    'INSERT INTO usuario (email, nombre, password_hash) VALUES ($1, $2, $3) RETURNING id, email, nombre, created_at',
    [email, nombre, hash]
  );

  const token = jwt.sign({ id: rows[0].id, email }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.status(201).json({ usuario: rows[0], token });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email y password son requeridos' });
  }

  const { rows } = await pool.query('SELECT * FROM usuario WHERE email = $1', [email]);
  if (!rows.length) return res.status(401).json({ error: 'Credenciales incorrectas' });

  const ok = await bcrypt.compare(password, rows[0].password_hash);
  if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' });

  const token = jwt.sign(
    { id: rows[0].id, email: rows[0].email },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
  res.json({ usuario: { id: rows[0].id, email: rows[0].email, nombre: rows[0].nombre }, token });
}

async function me(req, res) {
  const { rows } = await pool.query(
    'SELECT id, email, nombre, created_at FROM usuario WHERE id = $1',
    [req.usuario.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(rows[0]);
}

module.exports = { registro, login, me };
