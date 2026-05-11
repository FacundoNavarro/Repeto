require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/palabras',   require('./routes/palabras'));
app.use('/api/srs',        require('./routes/srs'));

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Error handler global — captura errores no manejados en controllers
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
const dbUrl = process.env.DATABASE_URL;
console.log('DATABASE_URL:', dbUrl ? `${dbUrl.slice(0, 30)}...` : 'UNDEFINED');
app.listen(PORT, () => console.log(`Backend escuchando en puerto ${PORT}`));
