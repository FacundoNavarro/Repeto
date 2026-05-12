const router = require('express').Router();
const ctrl = require('../controllers/statsController');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

router.use(auth);
router.get('/', asyncHandler(ctrl.miStats));

module.exports = router;
