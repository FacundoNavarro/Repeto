const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { Pool } = require('pg');

const DIFICULTAD = { A1: 1, A2: 1, B1: 2, B2: 2, C1: 3 };

const COLORS = [
  '#4A90D9', '#E67E22', '#9B59B6', '#27AE60', '#E74C3C',
  '#1ABC9C', '#F39C12', '#2980B9', '#8E44AD', '#16A085',
  '#D35400', '#C0392B', '#2ECC71', '#3498DB', '#E91E63',
  '#FF5722', '#607D8B', '#795548', '#009688', '#673AB7',
];

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const rows = [];
  for (const line of content.split('\n').slice(1)) {
    if (!line.trim()) continue;
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"')                   { inQuotes = !inQuotes; }
      else if (char === ',' && !inQuotes) { fields.push(current.trim()); current = ''; }
      else                                { current += char; }
    }
    fields.push(current.trim());
    if (fields.length >= 5 && fields[0]) {
      rows.push({
        level: fields[0], category: fields[1], word: fields[2],
        type: fields[3], example: fields[4] || null, notes: fields[5] || null,
      });
    }
  }
  return rows;
}

async function importar(csvPath) {
  const rows = parseCSV(csvPath);
  console.log(`CSV leído: ${rows.length} entradas\n`);

  const isLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Categorías
    const categoriasUnicas = [...new Set(rows.map(r => r.category))];
    const catIds = {};
    let colorIdx = 0;

    for (const nombre of categoriasUnicas) {
      const { rows: ex } = await client.query('SELECT id FROM categoria WHERE nombre = $1', [nombre]);
      if (ex.length) {
        catIds[nombre] = ex[0].id;
        console.log(`  existe  → ${nombre}`);
      } else {
        const { rows: cr } = await client.query(
          'INSERT INTO categoria (nombre, color) VALUES ($1, $2) RETURNING id',
          [nombre, COLORS[colorIdx++ % COLORS.length]]
        );
        catIds[nombre] = cr[0].id;
        console.log(`  creada  → ${nombre}`);
      }
    }

    // Armar un INSERT masivo para todas las palabras
    const values = [];
    const params = [];
    let p = 1;
    for (const row of rows) {
      const catId = catIds[row.category];
      if (!catId) continue;
      values.push(`($${p},$${p+1},$${p+2},$${p+3},$${p+4})`);
      params.push(
        row.word.slice(0, 100),
        (row.notes || row.type || '—').slice(0, 200),
        row.example?.slice(0, 500) || null,
        catId,
        DIFICULTAD[row.level] || 1
      );
      p += 5;
    }

    const { rowCount } = await client.query(
      `INSERT INTO palabra (palabra, traduccion, ejemplo_uso, categoria_id, dificultad_base)
       VALUES ${values.join(',')}
       ON CONFLICT DO NOTHING`,
      params
    );

    await client.query('COMMIT');
    console.log(`\nListo: ${rowCount} palabras insertadas.`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

const csvPath = process.argv[2];
if (!csvPath) { console.error('Uso: node src/db/import_words.js <ruta-al-csv>'); process.exit(1); }

importar(path.resolve(csvPath)).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
