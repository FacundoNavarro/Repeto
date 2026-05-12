// Genera 003_seed_words.sql a partir del CSV — sin conexión a la DB
const fs = require('fs');
const path = require('path');

const DIFICULTAD = { A1: 1, A2: 1, B1: 2, B2: 2, C1: 3 };
const COLORS = [
  '#4A90D9','#E67E22','#9B59B6','#27AE60','#E74C3C',
  '#1ABC9C','#F39C12','#2980B9','#8E44AD','#16A085',
  '#D35400','#C0392B','#2ECC71','#3498DB','#E91E63',
  '#FF5722','#607D8B','#795548','#009688','#673AB7',
];

function esc(str) {
  return str?.replace(/'/g, "''") ?? '';
}

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const rows = [];
  for (const line of content.split('\n').slice(1)) {
    if (!line.trim()) continue;
    const fields = [];
    let current = '', inQuotes = false;
    for (const char of line) {
      if (char === '"')                   { inQuotes = !inQuotes; }
      else if (char === ',' && !inQuotes) { fields.push(current.trim()); current = ''; }
      else                                { current += char; }
    }
    fields.push(current.trim());
    if (fields.length >= 5 && fields[0]) {
      rows.push({ level: fields[0], category: fields[1], word: fields[2],
                  type: fields[3], example: fields[4] || null, notes: fields[5] || null });
    }
  }
  return rows;
}

const csvPath = process.argv[2];
if (!csvPath) { console.error('Uso: node generate_sql.js <archivo.csv>'); process.exit(1); }

const rows = parseCSV(path.resolve(csvPath));
const categorias = [...new Set(rows.map(r => r.category))];

let sql = '-- Migración 003: categorías y palabras del CSV\n\n';

// INSERT categorías con DO NOTHING para no duplicar
sql += '-- Categorías\n';
categorias.forEach((nombre, i) => {
  const color = COLORS[i % COLORS.length];
  sql += `INSERT INTO categoria (nombre, color) VALUES ('${esc(nombre)}', '${color}') ON CONFLICT DO NOTHING;\n`;
});

// INSERT palabras referenciando la categoría por nombre
sql += '\n-- Palabras\n';
for (const row of rows) {
  const palabra    = esc(row.word.slice(0, 100));
  const traduccion = esc((row.notes || row.type || '-').slice(0, 200));
  const ejemplo    = row.example ? `'${esc(row.example.slice(0, 500))}'` : 'NULL';
  const dificultad = DIFICULTAD[row.level] || 1;

  sql += `INSERT INTO palabra (palabra, traduccion, ejemplo_uso, categoria_id, dificultad_base) `
       + `SELECT '${palabra}','${traduccion}',${ejemplo},id,${dificultad} FROM categoria WHERE nombre='${esc(row.category)}' `
       + `ON CONFLICT DO NOTHING;\n`;
}

const outPath = path.join(__dirname, 'migrations', '003_seed_words.sql');
fs.writeFileSync(outPath, sql);
console.log(`Generado: ${outPath} (${rows.length} palabras, ${categorias.length} categorías)`);
