const swaggerJsdoc = require('swagger-jsdoc');

module.exports = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Anki API', version: '1.0.0' },
    servers: [{ url: '/' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Categoria: {
          type: 'object',
          properties: {
            id:          { type: 'integer' },
            nombre:      { type: 'string' },
            descripcion: { type: 'string' },
            color:       { type: 'string', example: '#4A90D9' },
          },
        },
        Palabra: {
          type: 'object',
          properties: {
            id:              { type: 'integer' },
            palabra:         { type: 'string' },
            traduccion:      { type: 'string' },
            ejemplo_uso:     { type: 'string' },
            categoria_id:    { type: 'integer' },
            dificultad_base: { type: 'integer', enum: [1, 2, 3] },
          },
        },
      },
    },
  },
  apis: ['./src/docs/*.yaml'],
});
