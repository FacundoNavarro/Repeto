const pool = require('../db/pool');

async function miStats(req, res) {
  const usuarioId = req.usuario.id;

  // Progreso general y nivel global
  const { rows: progreso } = await pool.query(
    `SELECT
       COUNT(*)::int                                          AS total_palabras,
       COALESCE(AVG(nivel), 0)                               AS promedio_nivel,
       COUNT(*) FILTER (WHERE nivel >= 3)::int               AS palabras_dominadas,
       COALESCE(SUM(aciertos), 0)::int                       AS aciertos_total,
       COALESCE(SUM(errores), 0)::int                        AS errores_total,
       COUNT(*) FILTER (WHERE proxima_revision <= NOW())::int AS pendientes_hoy
     FROM progreso
     WHERE usuario_id = $1`,
    [usuarioId]
  );

  // Distribución por nivel (0-5)
  const { rows: distribucion } = await pool.query(
    `SELECT nivel, COUNT(*)::int AS cantidad
     FROM progreso
     WHERE usuario_id = $1
     GROUP BY nivel
     ORDER BY nivel`,
    [usuarioId]
  );

  // Progreso por categoría
  const { rows: porCategoria } = await pool.query(
    `SELECT
       c.id, c.nombre, c.color,
       COUNT(pr.id)::int                              AS total,
       COUNT(pr.id) FILTER (WHERE pr.nivel >= 3)::int AS dominadas,
       COALESCE(AVG(pr.nivel), 0)                     AS promedio_nivel
     FROM categoria c
     JOIN palabra p ON p.categoria_id = c.id
     LEFT JOIN progreso pr ON pr.palabra_id = p.id AND pr.usuario_id = $1
     GROUP BY c.id, c.nombre, c.color
     ORDER BY c.nombre`,
    [usuarioId]
  );

  // Últimas 10 sesiones
  const { rows: sesiones } = await pool.query(
    `SELECT se.id, se.fecha, se.palabras_vistas, se.aciertos, se.errores,
            se.duracion_segundos, se.modo, c.nombre AS categoria_nombre
     FROM sesion_estudio se
     LEFT JOIN categoria c ON c.id = se.categoria_id
     WHERE se.usuario_id = $1
     ORDER BY se.fecha DESC
     LIMIT 10`,
    [usuarioId]
  );

  // Racha de días consecutivos
  const { rows: diasEstudio } = await pool.query(
    `SELECT DISTINCT DATE(fecha) AS dia
     FROM sesion_estudio
     WHERE usuario_id = $1
     ORDER BY dia DESC`,
    [usuarioId]
  );

  const racha = calcularRacha(diasEstudio.map(r => r.dia));

  // Nivel global: 70% promedio de niveles + 30% porcentaje de palabras dominadas
  const stats = progreso[0];
  const nivelGlobal = stats.total_palabras === 0
    ? 0
    : Math.min(5, Math.round(
        Number(stats.promedio_nivel) * 0.7 +
        (stats.palabras_dominadas / stats.total_palabras) * 5 * 0.3
      ));

  res.json({
    nivel_global: nivelGlobal,
    total_palabras: stats.total_palabras,
    palabras_dominadas: stats.palabras_dominadas,
    aciertos_total: stats.aciertos_total,
    errores_total: stats.errores_total,
    pendientes_hoy: stats.pendientes_hoy,
    racha_dias: racha,
    distribucion_niveles: distribucion,
    por_categoria: porCategoria,
    sesiones_recientes: sesiones,
  });
}

function calcularRacha(dias) {
  if (!dias.length) return 0;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let racha = 0;
  let esperado = new Date(hoy);

  for (const dia of dias) {
    const fecha = new Date(dia);
    fecha.setHours(0, 0, 0, 0);
    if (fecha.getTime() === esperado.getTime()) {
      racha++;
      esperado.setDate(esperado.getDate() - 1);
    } else {
      break;
    }
  }
  return racha;
}

module.exports = { miStats };
