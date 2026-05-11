const router = require('express').Router();
const ctrl = require('../controllers/srsController');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

router.use(auth); // todos los endpoints SRS requieren autenticación

router.get('/hoy',                       asyncHandler(ctrl.hoy));
router.get('/progreso',                  asyncHandler(ctrl.miProgreso));
router.post('/inicializar/:palabra_id',  asyncHandler(ctrl.inicializar));
router.post('/responder',                asyncHandler(ctrl.responder));

module.exports = router;
