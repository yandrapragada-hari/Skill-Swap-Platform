const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/token', authMiddleware, authController.refreshToken);
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
