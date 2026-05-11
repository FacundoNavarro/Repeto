function calcularProximaRevision(nivel, intervalo, facilidad, calificacion) {
  if (calificacion < 3) {
    return {
      nivel: 0,
      intervalo: 1,
      facilidad: Math.max(1.3, facilidad - 0.2),
    };
  }

  const nuevoIntervalo =
    nivel === 0 ? 1 :
    nivel === 1 ? 6 :
    Math.round(intervalo * facilidad);

  const nuevaFacilidad = Math.max(
    1.3,
    facilidad + 0.1 - (5 - calificacion) * 0.08 + (5 - calificacion) * 0.02
  );

  return {
    nivel: Math.min(nivel + 1, 5),
    intervalo: nuevoIntervalo,
    facilidad: nuevaFacilidad,
  };
}

module.exports = { calcularProximaRevision };
