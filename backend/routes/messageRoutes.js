const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/auth');

router.get('/conversations', authMiddleware, messageController.getConversations);
router.get('/:conversationId', authMiddleware, messageController.getMessages);
router.post('/:conversationId', authMiddleware, messageController.sendMessage);
router.post('/:conversationId/upload', authMiddleware, messageController.uploadFile);
router.put('/:conversationId/read', authMiddleware, messageController.markAsRead);

module.exports = router;
