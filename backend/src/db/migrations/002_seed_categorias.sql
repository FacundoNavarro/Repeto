-- Migración 002: Categorías iniciales de ejemplo
INSERT INTO categoria (nombre, descripcion, color) VALUES
  ('Verbos comunes',    'Los verbos más usados en inglés cotidiano', '#4A90D9'),
  ('Vocabulario B1',   'Palabras de nivel intermedio',               '#E67E22'),
  ('Phrasal verbs',    'Verbos con partículas (get up, look for…)',  '#9B59B6'),
  ('Adjetivos',        'Describir personas, cosas y situaciones',    '#27AE60'),
  ('Expresiones',      'Frases hechas y expresiones idiomáticas',    '#E74C3C')
ON CONFLICT DO NOTHING;
