const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

router.put('/', authMiddleware, userController.updateProfile);
router.post('/avatar', authMiddleware, userController.uploadAvatar);
router.delete('/avatar', authMiddleware, userController.deleteAvatar);
router.get('/:id', authMiddleware, userController.getUserProfile);

module.exports = router;
