const pool = require('../db/pool');
const { calcularProximaRevision } = require('../services/srs');

// Nivel de usuario → dificultad máxima desbloqueada
function dificultadDesbloqueada(nivelGlobal, palabrasDominadas) {
  if (nivelGlobal >= 3 && palabrasDominadas >= 20) return 3; // C1
  if (nivelGlobal >= 1 && palabrasDominadas >= 5)  return 2; // B1/B2
  return 1; // A1/A2 — arranque
}

// Palabras pendientes para hoy (SRS)
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

// Estado del deck del usuario (cuántas palabras tiene, nivel actual)
async function estadoDeck(req, res) {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*)::int                                AS total_en_deck,
       COUNT(*) FILTER (WHERE nivel >= 3)::int      AS dominadas,
       COALESCE(AVG(nivel), 0)                      AS promedio_nivel,
       COUNT(*) FILTER (WHERE proxima_revision <= NOW())::int AS pendientes_hoy
     FROM progreso WHERE usuario_id = $1`,
    [req.usuario.id]
  );

  const { total_en_deck, dominadas, promedio_nivel, pendientes_hoy } = rows[0];
  const nivelGlobal   = Math.min(5, Math.round(Number(promedio_nivel)));
  const maxDificultad = dificultadDesbloqueada(nivelGlobal, dominadas);

  // Cuántas palabras nuevas quedan disponibles para agregar
  const { rows: disponibles } = await pool.query(
    `SELECT COUNT(*)::int AS cant
     FROM palabra p
     WHERE p.dificultad_base <= $1
       AND NOT EXISTS (
         SELECT 1 FROM progreso pr
         WHERE pr.usuario_id = $2 AND pr.palabra_id = p.id
       )`,
    [maxDificultad, req.usuario.id]
  );

  res.json({
    total_en_deck,
    dominadas,
    nivel_global: nivelGlobal,
    max_dificultad: maxDificultad,
    pendientes_hoy,
    disponibles_para_agregar: disponibles[0].cant,
  });
}

// Auto-agregar palabras al deck según el nivel del usuario
async function inicializarNivel(req, res) {
  const { rows: stats } = await pool.query(
    `SELECT COALESCE(AVG(nivel), 0) AS promedio_nivel,
            COUNT(*) FILTER (WHERE nivel >= 3)::int AS dominadas
     FROM progreso WHERE usuario_id = $1`,
    [req.usuario.id]
  );

  const nivelGlobal   = Math.min(5, Math.round(Number(stats[0].promedio_nivel)));
  const maxDificultad = dificultadDesbloqueada(nivelGlobal, stats[0].dominadas);

  // Tomar hasta 20 palabras nuevas de la dificultad correspondiente
  const { rows: nuevas } = await pool.query(
    `SELECT p.id FROM palabra p
     WHERE p.dificultad_base <= $1
       AND NOT EXISTS (
         SELECT 1 FROM progreso pr
         WHERE pr.usuario_id = $2 AND pr.palabra_id = p.id
       )
     ORDER BY p.dificultad_base ASC, RANDOM()
     LIMIT 20`,
    [maxDificultad, req.usuario.id]
  );

  if (!nuevas.length) {
    return res.json({ agregadas: 0, mensaje: 'No hay palabras nuevas disponibles para tu nivel.' });
  }

  for (const { id } of nuevas) {
    await pool.query(
      `INSERT INTO progreso (usuario_id, palabra_id, proxima_revision)
       VALUES ($1, $2, NOW())
       ON CONFLICT DO NOTHING`,
      [req.usuario.id, id]
    );
  }

  res.json({ agregadas: nuevas.length, nivel_global: nivelGlobal, max_dificultad: maxDificultad });
}

// Agregar una palabra específica al progreso
async function inicializar(req, res) {
  const { palabra_id } = req.params;
  const { rows } = await pool.query(
    `INSERT INTO progreso (usuario_id, palabra_id, proxima_revision)
     VALUES ($1, $2, NOW())
     ON CONFLICT (usuario_id, palabra_id) DO NOTHING
     RETURNING *`,
    [req.usuario.id, palabra_id]
  );
  if (!rows.length) return res.status(409).json({ error: 'La palabra ya está en tu progreso' });
  res.status(201).json(rows[0]);
}

// Registrar respuesta y actualizar SRS
async function responder(req, res) {
  const { palabra_id, calificacion } = req.body;

  if (calificacion === undefined || calificacion < 0 || calificacion > 5) {
    return res.status(400).json({ error: 'calificacion debe ser entre 0 y 5' });
  }

  const { rows: actual } = await pool.query(
    'SELECT * FROM progreso WHERE usuario_id = $1 AND palabra_id = $2',
    [req.usuario.id, palabra_id]
  );
  if (!actual.length) return res.status(404).json({ error: 'Palabra no en progreso' });

  const { nivel, intervalo, facilidad } = actual[0];
  const siguiente = calcularProximaRevision(nivel, intervalo, Number(facilidad), calificacion);
  const proxima   = new Date(Date.now() + siguiente.intervalo * 86400000);

  const { rows: updated } = await pool.query(
    `UPDATE progreso
     SET nivel = $1, intervalo = $2, facilidad = $3, proxima_revision = $4,
         ultima_vez_vista = NOW(),
         aciertos = aciertos + $5,
         errores  = errores  + $6
     WHERE usuario_id = $7 AND palabra_id = $8
     RETURNING *`,
    [siguiente.nivel, siguiente.intervalo, siguiente.facilidad, proxima,
     calificacion >= 3 ? 1 : 0, calificacion < 3 ? 1 : 0,
     req.usuario.id, palabra_id]
  );

  res.json({ progreso: updated[0], proxima_revision: proxima });
}

// Guardar sesión libre
async function guardarSesionLibre(req, res) {
  const { categoria_id, palabras_vistas, aciertos, errores, duracion_segundos } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO sesion_estudio
       (usuario_id, categoria_id, palabras_vistas, aciertos, errores, duracion_segundos, modo)
     VALUES ($1, $2, $3, $4, $5, $6, 'libre')
     RETURNING *`,
    [req.usuario.id, categoria_id, palabras_vistas ?? 0, aciertos ?? 0, errores ?? 0, duracion_segundos ?? null]
  );
  res.status(201).json(rows[0]);
}

// Progreso completo
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

module.exports = { hoy, estadoDeck, inicializarNivel, inicializar, responder, guardarSesionLibre, miProgreso };
