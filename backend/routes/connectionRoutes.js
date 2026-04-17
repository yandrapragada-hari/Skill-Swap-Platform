const express = require('express');
const router = express.Router();
const connectionController = require('../controllers/connectionController');
const authMiddleware = require('../middleware/auth');

router.get('/matches', authMiddleware, connectionController.getMatches);
router.get('/', authMiddleware, connectionController.getConnections);
router.get('/pending', authMiddleware, connectionController.getPendingConnections);
router.get('/reviews/:userId', authMiddleware, connectionController.getReviewsForUser);
router.post('/request/:id', authMiddleware, connectionController.requestConnection);
router.put('/:id/respond', authMiddleware, connectionController.respondToConnection);
router.put('/:id/complete', authMiddleware, connectionController.completeSwap);
router.post('/:id/review', authMiddleware, connectionController.addReview);
router.delete('/:id', authMiddleware, connectionController.deleteConnection);
router.get('/peers', authMiddleware, connectionController.getPeers);

module.exports = router;
