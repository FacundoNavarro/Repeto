-- Migración 001: Schema inicial
-- Ejecutar en Railway PostgreSQL

-- USUARIO
CREATE TABLE IF NOT EXISTS usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- CATEGORIA
CREATE TABLE IF NOT EXISTS categoria (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  color VARCHAR(7)
);

-- PALABRA
CREATE TABLE IF NOT EXISTS palabra (
  id SERIAL PRIMARY KEY,
  palabra VARCHAR(100) NOT NULL,
  traduccion VARCHAR(200) NOT NULL,
  ejemplo_uso TEXT,
  categoria_id INTEGER NOT NULL REFERENCES categoria(id),
  imagen_url VARCHAR(500),
  dificultad_base SMALLINT NOT NULL DEFAULT 1 CHECK (dificultad_base BETWEEN 1 AND 3),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- PROGRESO
CREATE TABLE IF NOT EXISTS progreso (
  id SERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuario(id),
  palabra_id INTEGER NOT NULL REFERENCES palabra(id),
  nivel SMALLINT NOT NULL DEFAULT 0 CHECK (nivel BETWEEN 0 AND 5),
  facilidad DECIMAL(4,2) NOT NULL DEFAULT 2.5,
  intervalo INTEGER NOT NULL DEFAULT 1,
  aciertos INTEGER NOT NULL DEFAULT 0,
  errores INTEGER NOT NULL DEFAULT 0,
  ultima_vez_vista TIMESTAMP,
  proxima_revision TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(usuario_id, palabra_id)
);

-- SESION_ESTUDIO
CREATE TABLE IF NOT EXISTS sesion_estudio (
  id SERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuario(id),
  fecha TIMESTAMP NOT NULL DEFAULT NOW(),
  palabras_vistas INTEGER NOT NULL DEFAULT 0,
  aciertos INTEGER NOT NULL DEFAULT 0,
  errores INTEGER NOT NULL DEFAULT 0,
  duracion_segundos INTEGER,
  modo VARCHAR(10) NOT NULL DEFAULT 'srs' CHECK (modo IN ('srs', 'libre')),
  categoria_id INTEGER REFERENCES categoria(id)
);
