const User = require('../models/User');
const Connection = require('../models/Connection');
const { sanitizeUser } = require('./authController');

const hydrateConnection = (conn, currentUserId) => {
  const requester = conn.requester ? sanitizeUser(conn.requester) : null;
  const recipient = conn.recipient ? sanitizeUser(conn.recipient) : null;
  const peer = requester?.id === String(currentUserId) ? recipient : requester;

  return {
    id: String(conn._id),
    _id: String(conn._id),
    requester,
    recipient,
    user: peer,
    status: conn.status,
    message: conn.message,
    sharedSkills: conn.sharedSkills,
    sharedTeachSkills: conn.sharedSkills,
    swapCompletedBy: (conn.swapCompletedBy || []).map(id => id.toString()),
    reviews: conn.reviews || [],
    createdAt: conn.createdAt,
    updatedAt: conn.updatedAt,
  };
};

exports.getMatches = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    if (!me) {
      console.error(`getMatches: Current user ${req.user.id} not found`);
      return res.status(404).json({ message: 'Current user not found' });
    }

    const users = await User.find({ _id: { $ne: req.user._id } }).select('-password');

    // Count accepted connections per user (like "followers")
    const allConnections = await Connection.find({
      status: { $in: ['accepted', 'completed'] },
    }).select('requester recipient');

    const matches = users.map((u) => {
      const user = sanitizeUser(u);
      
      // Safety check for skills arrays
      const myLearnSkills = me.learnSkills || [];
      const myTeachSkills = me.teachSkills || [];
      const userTeachSkills = u.teachSkills || [];
      const userLearnSkills = u.learnSkills || [];

      const teachesYou = userTeachSkills.filter((s) => myLearnSkills.includes(s));
      const learnsFromYou = userLearnSkills.filter((s) => myTeachSkills.includes(s));
      
      const score = Math.min(100, Math.max(35, (teachesYou.length + learnsFromYou.length) * 18 + 35));

      // Count accepted connections for this user (like Instagram followers)
      const uid = String(u._id);
      const connectionCount = allConnections.filter(c =>
        String(c.requester) === uid || String(c.recipient) === uid
      ).length;

      return {
        user: { ...user, connectionCount }, // completedSwaps is already on user from sanitizeUser
        score,
        teachesYou,
        learnsFromYou,
        isReciprocal: teachesYou.length > 0 && learnsFromYou.length > 0,
      };
    }).sort((a, b) => b.score - a.score);

    return res.json({ matches });
  } catch (err) {
    console.error('Error in getMatches:', err);
    return res.status(500).json({ message: 'Unable to load matches' });
  }
};

exports.getConnections = async (req, res) => {
  try {
    const connections = await Connection.find({
      status: { $in: ['accepted', 'completed'] },
      $or: [{ requester: req.user.id }, { recipient: req.user.id }],
    })
      .populate('requester', '-password')
      .populate('recipient', '-password')
      .sort({ updatedAt: -1 });

    return res.json({ connections: connections.map((c) => hydrateConnection(c, req.user.id)) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unable to load connections' });
  }
};

exports.getPendingConnections = async (req, res) => {
  try {
    const incoming = await Connection.find({ recipient: req.user.id, status: 'pending' })
      .populate('requester', '-password')
      .populate('recipient', '-password')
      .sort({ createdAt: -1 });

    const outgoing = await Connection.find({ requester: req.user.id, status: 'pending' })
      .populate('requester', '-password')
      .populate('recipient', '-password')
      .sort({ createdAt: -1 });

    return res.json({
      incoming: incoming.map((c) => hydrateConnection(c, req.user.id)),
      outgoing: outgoing.map((c) => hydrateConnection(c, req.user.id)),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unable to load pending connections' });
  }
};

exports.requestConnection = async (req, res) => {
  try {
    const recipientUser = await User.findById(req.params.id);
    if (!recipientUser) return res.status(404).json({ message: 'User not found' });
    if (recipientUser._id.toString() === req.user.id)
      return res.status(400).json({ message: 'Cannot connect with yourself' });

    const existing = await Connection.findOne({
      $or: [
        { requester: req.user.id, recipient: recipientUser._id },
        { requester: recipientUser._id, recipient: req.user.id },
      ],
    });
    if (existing) return res.status(409).json({ message: 'Connection already exists' });

    const me = await User.findById(req.user.id);
    const sharedSkills = (me.teachSkills || []).filter((s) => (recipientUser.learnSkills || []).includes(s));

    let conn = await Connection.create({
      requester: req.user.id,
      recipient: recipientUser._id,
      sharedSkills,
      message: req.body.message || '',
      status: 'pending',
    });

    conn = await Connection.findById(conn._id)
      .populate('requester', '-password')
      .populate('recipient', '-password');

    return res.status(201).json({
      message: 'Connection request created',
      connection: hydrateConnection(conn, req.user.id),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unable to create connection request' });
  }
};

exports.respondToConnection = async (req, res) => {
  try {
    const conn = await Connection.findById(req.params.id);
    if (!conn) return res.status(404).json({ message: 'Connection not found' });
    if (conn.recipient.toString() !== req.user.id)
      return res.status(403).json({ message: 'Not authorized' });
    if (!['accepted', 'rejected'].includes(req.body.status))
      return res.status(400).json({ message: 'Invalid status' });

    conn.status = req.body.status;
    await conn.save();

    const populated = await Connection.findById(conn._id)
      .populate('requester', '-password')
      .populate('recipient', '-password');

    return res.json({ message: 'Connection updated', connection: hydrateConnection(populated, req.user.id) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unable to update connection' });
  }
};

exports.deleteConnection = async (req, res) => {
  try {
    const conn = await Connection.findById(req.params.id);
    if (!conn) return res.status(404).json({ message: 'Connection not found' });
    if (![conn.requester.toString(), conn.recipient.toString()].includes(req.user.id))
      return res.status(403).json({ message: 'Not authorized' });

    await Connection.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Connection removed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unable to remove connection' });
  }
};

exports.completeSwap = async (req, res) => {
  try {
    const conn = await Connection.findById(req.params.id);
    if (!conn) return res.status(404).json({ message: 'Connection not found' });
    if (conn.status !== 'accepted' && conn.status !== 'completed')
      return res.status(400).json({ message: 'Connection must be accepted first' });
    if (![conn.requester.toString(), conn.recipient.toString()].includes(req.user.id))
      return res.status(403).json({ message: 'Not authorized' });

    // Check if user already marked as complete
    const alreadyMarked = (conn.swapCompletedBy || []).map(id => id.toString());
    if (alreadyMarked.includes(req.user.id)) {
      return res.status(400).json({ message: 'You already marked this swap as complete' });
    }

    conn.swapCompletedBy = [...alreadyMarked, req.user.id];

    // If both users confirmed, mark as completed and increment counters
    if (conn.swapCompletedBy.length >= 2) {
      conn.status = 'completed';
      await User.findByIdAndUpdate(conn.requester, { $inc: { completedSwaps: 1 } });
      await User.findByIdAndUpdate(conn.recipient, { $inc: { completedSwaps: 1 } });
    }

    await conn.save();

    const populated = await Connection.findById(conn._id)
      .populate('requester', '-password')
      .populate('recipient', '-password');

    return res.json({
      message: conn.swapCompletedBy.length >= 2
        ? 'Swap completed! Both users confirmed.'
        : 'Marked as complete. Waiting for the other user to confirm.',
      connection: hydrateConnection(populated, req.user.id),
      swapCompletedBy: conn.swapCompletedBy.map(id => id.toString()),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unable to complete swap' });
  }
};

exports.addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const conn = await Connection.findById(req.params.id);
    if (!conn) return res.status(404).json({ message: 'Connection not found' });
    if (![conn.requester.toString(), conn.recipient.toString()].includes(req.user.id))
      return res.status(403).json({ message: 'Not authorized' });

    // Determine who is being reviewed
    const revieweeId = conn.requester.toString() === req.user.id
      ? conn.recipient
      : conn.requester;

    // Check if already reviewed
    const existingReview = (conn.reviews || []).find(
      r => r.reviewer.toString() === req.user.id
    );
    if (existingReview) {
      return res.status(400).json({ message: 'You already reviewed this swap' });
    }

    conn.reviews.push({
      reviewer: req.user.id,
      reviewee: revieweeId,
      rating: Number(rating),
      comment: comment || '',
    });
    await conn.save();

    // Update the reviewee's average rating
    const allConnections = await Connection.find({
      'reviews.reviewee': revieweeId,
    });
    let totalRating = 0;
    let totalCount = 0;
    allConnections.forEach(c => {
      c.reviews.forEach(r => {
        if (r.reviewee.toString() === revieweeId.toString()) {
          totalRating += r.rating;
          totalCount++;
        }
      });
    });

    const avgRating = totalCount > 0 ? totalRating / totalCount : 0;
    await User.findByIdAndUpdate(revieweeId, {
      rating: Math.round(avgRating * 10) / 10,
      totalRatings: totalCount,
    });

    return res.json({
      message: 'Review submitted successfully!',
      review: conn.reviews[conn.reviews.length - 1],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unable to submit review' });
  }
};

exports.getReviewsForUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const connections = await Connection.find({
      'reviews.reviewee': userId,
    }).populate('reviews.reviewer', 'name avatar');

    const reviews = [];
    connections.forEach(conn => {
      conn.reviews.forEach(r => {
        if (r.reviewee.toString() === userId) {
          reviews.push({
            _id: r._id,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.createdAt,
            reviewer: r.reviewer,
          });
        }
      });
    });

    reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({ reviews });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unable to fetch reviews' });
  }
};

exports.getPeers = async (req, res) => {
  try {
    const connections = await Connection.find({
      status: 'accepted',
      $or: [{ requester: req.user.id }, { recipient: req.user.id }],
    })
      .populate('requester', '-password')
      .populate('recipient', '-password');

    const peers = connections.map((c) => {
      const peer = c.requester._id.toString() === req.user.id
        ? sanitizeUser(c.recipient)
        : sanitizeUser(c.requester);
      return peer;
    });

    return res.json({ peers });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unable to load peers' });
  }
};

exports.hydrateConnection = hydrateConnection;
