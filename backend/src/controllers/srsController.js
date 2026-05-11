const pool = require('../db/pool');
const { calcularProximaRevision } = require('../services/srs');

// Palabras pendientes para hoy
async function hoy(req, res) {
  const { rows } = await pool.query(
    `SELECT p.id, p.palabra, p.traduccion, p.ejemplo_uso, p.dificultad_base,
            c.nombre AS categoria_nombre, c.color AS categoria_color,
            pr.nivel, pr.facilidad, pr.intervalo, pr.aciertos, pr.errores
     FROM progreso pr
     JOIN palabra p ON p.id = pr.palabra_id
     JOIN categoria c ON c.id = p.categoria_id
     WHERE pr.usuario_id = $1
       AND pr.proxima_revision <= NOW()
     ORDER BY pr.proxima_revision ASC
     LIMIT 20`,
    [req.usuario.id]
  );
  res.json(rows);
}

// Agregar una palabra al progreso del usuario (si no existe ya)
async function inicializar(req, res) {
  const { palabra_id } = req.params;

  const { rows } = await pool.query(
    `INSERT INTO progreso (usuario_id, palabra_id, proxima_revision)
     VALUES ($1, $2, NOW())
     ON CONFLICT (usuario_id, palabra_id) DO NOTHING
     RETURNING *`,
    [req.usuario.id, palabra_id]
  );

  if (!rows.length) {
    return res.status(409).json({ error: 'La palabra ya está en tu progreso' });
  }
  res.status(201).json(rows[0]);
}

// Registrar respuesta y actualizar progreso SRS
async function responder(req, res) {
  const { palabra_id, calificacion } = req.body;

  if (calificacion === undefined || calificacion < 0 || calificacion > 5) {
    return res.status(400).json({ error: 'calificacion debe ser un número entre 0 y 5' });
  }

  const { rows: actual } = await pool.query(
    'SELECT * FROM progreso WHERE usuario_id = $1 AND palabra_id = $2',
    [req.usuario.id, palabra_id]
  );
  if (!actual.length) {
    return res.status(404).json({ error: 'Palabra no encontrada en tu progreso' });
  }

  const { nivel, intervalo, facilidad } = actual[0];
  const siguiente = calcularProximaRevision(nivel, intervalo, Number(facilidad), calificacion);
  const proxima = new Date(Date.now() + siguiente.intervalo * 86400000);

  const { rows: updated } = await pool.query(
    `UPDATE progreso
     SET nivel             = $1,
         intervalo         = $2,
         facilidad         = $3,
         proxima_revision  = $4,
         ultima_vez_vista  = NOW(),
         aciertos          = aciertos + $5,
         errores           = errores  + $6
     WHERE usuario_id = $7 AND palabra_id = $8
     RETURNING *`,
    [
      siguiente.nivel,
      siguiente.intervalo,
      siguiente.facilidad,
      proxima,
      calificacion >= 3 ? 1 : 0,
      calificacion < 3  ? 1 : 0,
      req.usuario.id,
      palabra_id,
    ]
  );

  res.json({ progreso: updated[0], proxima_revision: proxima });
}

// Progreso completo del usuario
async function miProgreso(req, res) {
  const { rows } = await pool.query(
    `SELECT p.id, p.palabra, p.traduccion, c.nombre AS categoria,
            pr.nivel, pr.intervalo, pr.facilidad, pr.aciertos, pr.errores,
            pr.ultima_vez_vista, pr.proxima_revision
     FROM progreso pr
     JOIN palabra p ON p.id = pr.palabra_id
     JOIN categoria c ON c.id = p.categoria_id
     WHERE pr.usuario_id = $1
     ORDER BY pr.nivel DESC, p.palabra`,
    [req.usuario.id]
  );
  res.json(rows);
}

module.exports = { hoy, inicializar, responder, miProgreso };
