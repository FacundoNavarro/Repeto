# Flashcard App — Context & Decisions

## Descripción del proyecto

App mobile para aprender inglés con flashcards estilo Anki. Permite estudiar vocabulario con un algoritmo de repetición espaciada (SRS) que decide qué palabras repasar y cuándo, más un modo libre para practicar por categoría o antes de un parcial.

El usuario acumula progreso a lo largo del tiempo, sube de nivel por palabra, y puede ver su historial de estudio.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Mobile | React Native + Expo |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL |
| IA | Claude (Anthropic SDK) |
| Deploy backend | Railway |
| Deploy app | TestFlight (iPhone) |

---

## Estructura del repositorio

Monorepo — un solo repositorio con dos carpetas principales:

```
flashcard-app/
├── CONTEXT.md
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── db/
│   │   └── services/
│   └── package.json
└── mobile/
    ├── app/
    ├── components/
    └── package.json
```

---

## Base de datos

### Schema SQL completo

```sql
-- USUARIO
CREATE TABLE usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- CATEGORIA
CREATE TABLE categoria (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  color VARCHAR(7) -- hex color ej: #FF5733, para usar en la UI
);

-- PALABRA
CREATE TABLE palabra (
  id SERIAL PRIMARY KEY,
  palabra VARCHAR(100) NOT NULL,
  traduccion VARCHAR(200) NOT NULL,
  ejemplo_uso TEXT,
  categoria_id INTEGER NOT NULL REFERENCES categoria(id),
  imagen_url VARCHAR(500), -- nullable, para una fase posterior
  dificultad_base SMALLINT NOT NULL DEFAULT 1 CHECK (dificultad_base BETWEEN 1 AND 3),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- PROGRESO
CREATE TABLE progreso (
  id SERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuario(id),
  palabra_id INTEGER NOT NULL REFERENCES palabra(id),
  nivel SMALLINT NOT NULL DEFAULT 0 CHECK (nivel BETWEEN 0 AND 5),
  facilidad DECIMAL(4,2) NOT NULL DEFAULT 2.5,  -- multiplicador SRS, mínimo 1.3
  intervalo INTEGER NOT NULL DEFAULT 1,          -- días hasta próxima revisión
  aciertos INTEGER NOT NULL DEFAULT 0,
  errores INTEGER NOT NULL DEFAULT 0,
  ultima_vez_vista TIMESTAMP,
  proxima_revision TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(usuario_id, palabra_id)
);

-- SESION_ESTUDIO
CREATE TABLE sesion_estudio (
  id SERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuario(id),
  fecha TIMESTAMP NOT NULL DEFAULT NOW(),
  palabras_vistas INTEGER NOT NULL DEFAULT 0,
  aciertos INTEGER NOT NULL DEFAULT 0,
  errores INTEGER NOT NULL DEFAULT 0,
  duracion_segundos INTEGER,
  modo VARCHAR(10) NOT NULL DEFAULT 'srs' CHECK (modo IN ('srs', 'libre')),
  categoria_id INTEGER REFERENCES categoria(id) -- solo se usa en modo libre, nullable
);
```

### Relaciones

```
usuario
categoria
palabra          → categoria
progreso         → usuario, palabra
sesion_estudio   → usuario, categoria (nullable)
```

### Nivel global del usuario

No se guarda — se calcula a partir de la tabla `progreso`:

```
nivel_usuario = f(promedio de niveles, cantidad de palabras con nivel >= 3)
```

---

## Algoritmo SRS (SM-2)

Basado en el algoritmo SM-2, el mismo que usa Anki.

### Variables por palabra (en tabla `progreso`)

| Campo | Descripción |
|-------|-------------|
| `nivel` | 0-5, qué tan bien se sabe la palabra |
| `intervalo` | días hasta la próxima revisión |
| `facilidad` | multiplicador, empieza en 2.5, mínimo 1.3 |

### Calificaciones posibles

| Valor | Significado |
|-------|-------------|
| 0 | No la sabía para nada |
| 1 | Muy difícil |
| 2 | Difícil, con esfuerzo |
| 3 | Bien |
| 4 | Fácil |
| 5 | Muy fácil |

### Lógica

```
Si calificacion < 3:
  → nivel = 0
  → intervalo = 1 día
  → facilidad = max(1.3, facilidad - 0.2)

Si calificacion >= 3:
  → Si nivel == 0: intervalo = 1
  → Si nivel == 1: intervalo = 6
  → Si nivel >= 2: intervalo = round(intervalo_anterior × facilidad)

  → facilidad = max(1.3, facilidad + 0.1 - (5 - calificacion) × 0.08 + (5 - calificacion) × 0.02)
  → nivel += 1
```

### Implementación en JavaScript

```javascript
function calcularProximaRevision(nivel, intervalo, facilidad, calificacion) {
  if (calificacion < 3) {
    return {
      nivel: 0,
      intervalo: 1,
      facilidad: Math.max(1.3, facilidad - 0.2)
    };
  }

  const nuevoIntervalo = nivel === 0 ? 1
                       : nivel === 1 ? 6
                       : Math.round(intervalo * facilidad);

  const nuevaFacilidad = Math.max(
    1.3,
    facilidad + 0.1 - (5 - calificacion) * 0.08 + (5 - calificacion) * 0.02
  );

  return {
    nivel: nivel + 1,
    intervalo: nuevoIntervalo,
    facilidad: nuevaFacilidad
  };
}
```

### Query para obtener palabras a estudiar hoy

```sql
SELECT p.palabra, p.traduccion, p.ejemplo_uso, pr.nivel
FROM progreso pr
JOIN palabra p ON p.id = pr.palabra_id
WHERE pr.usuario_id = $1
  AND pr.proxima_revision <= NOW()
ORDER BY pr.proxima_revision ASC
LIMIT 20;
```

---

## Modos de estudio

### Modo SRS (Anki)
- El algoritmo decide qué palabras se muestran y cuándo
- Actualiza la tabla `progreso` con cada respuesta
- Para la rutina diaria y el aprendizaje a largo plazo

### Modo Libre
- El usuario elige qué estudiar: por categoría, por nivel, por palabra específica
- **No modifica la tabla `progreso`** — no interfiere con el algoritmo SRS
- Guarda la sesión en `sesion_estudio` con `modo = 'libre'`
- Ideal para repasar antes de un parcial o practicar una categoría puntual

---

## Rol de Claude (IA)

Claude se integra en el backend para:

- Generar ejemplos de uso de cada palabra en contexto
- Explicar diferencias sutiles entre palabras similares ("say" vs "tell" vs "speak")
- Evaluar respuestas abiertas del usuario (no solo multiple choice)
- Sugerir palabras relacionadas para agregar al deck

Se usa el Anthropic SDK en el backend — nunca se expone la API key al mobile.

---

## Fases del proyecto

| Fase | Qué se construye |
|------|-----------------|
| 1 | Setup monorepo, DB en Railway, migraciones SQL |
| 2 | Backend: CRUD de palabras y categorías |
| 3 | Algoritmo SRS en backend |
| 4 | Mobile: pantallas básicas (listado, sesión de estudio) |
| 5 | Integración mobile ↔ backend |
| 6 | Dashboard de progreso y niveles |
| 7 | Integración Claude (ejemplos, evaluación) |
| 8 | TestFlight build para iPhone |
| 9 | Imágenes por palabra (fase opcional) |

---

## Decisiones tomadas y por qué

- **Monorepo**: el proyecto es solo de un desarrollador, Claude Code trabaja mejor viendo todo el contexto junto
- **React Native + Expo**: el uso principal es desde iPhone, se necesita app nativa real instalable vía TestFlight
- **No PWA**: iOS tiene limitaciones importantes con PWA que degradan la experiencia
- **Railway**: tiene PostgreSQL integrado, deploy simple, plan gratuito para empezar
- **Modo libre no toca progreso**: para no contaminar el algoritmo SRS con repasos forzados
- **Nivel global calculado, no guardado**: el dato base es el progreso por palabra, el nivel global es una consecuencia
- **UUID para usuario**: mejor que serial int para IDs de usuario
- **UNIQUE(usuario_id, palabra_id) en progreso**: evita duplicados si hay bugs en el código
