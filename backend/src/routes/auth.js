const router = require('express').Router();
const ctrl = require('../controllers/authController');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

router.post('/registro', asyncHandler(ctrl.registro));
router.post('/login',    asyncHandler(ctrl.login));
router.get('/me',        auth, asyncHandler(ctrl.me));

module.exports = router;
