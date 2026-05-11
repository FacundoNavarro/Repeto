const router = require('express').Router();
const ctrl = require('../controllers/categoriasController');
const asyncHandler = require('../middleware/asyncHandler');

router.get('/',       asyncHandler(ctrl.listar));
router.get('/:id',    asyncHandler(ctrl.obtener));
router.post('/',      asyncHandler(ctrl.crear));
router.put('/:id',    asyncHandler(ctrl.actualizar));
router.delete('/:id', asyncHandler(ctrl.eliminar));

module.exports = router;
