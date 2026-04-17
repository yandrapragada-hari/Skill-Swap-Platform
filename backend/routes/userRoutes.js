const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

router.put('/', authMiddleware, userController.updateProfile);
router.get('/:id', authMiddleware, userController.getUserProfile);

module.exports = router;
