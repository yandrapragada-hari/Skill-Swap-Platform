require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const connectionRoutes = require('./routes/connectionRoutes');
const messageRoutes = require('./routes/messageRoutes');
const { conversationIdFromUsers, hydrateMessage } = require('./controllers/messageController');
const Message = require('./models/Message');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));
// Serve React build
app.use(express.static(path.join(__dirname, '../frontend/build')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, credentials: true } });

// Attach io to request object for controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

const PORT = process.env.BACKEND_PORT || 5000;

// ── MongoDB Connection ──────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// ── Socket.io ───────────────────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('sendMessage', async ({ senderId, receiverId, content, conversationId }) => {
    try {
      if (!senderId || !receiverId || !content?.trim()) return;

      const normalizedConvId = conversationId || conversationIdFromUsers(senderId, receiverId);

      let message = await Message.create({
        conversationId: normalizedConvId,
        participants: [senderId, receiverId],
        sender: senderId,
        receiver: receiverId,
        content: String(content).trim(),
        read: false,
      });

      message = await Message.findById(message._id)
        .populate('sender', '-password')
        .populate('receiver', '-password');

      const payload = hydrateMessage(message);

      io.to(String(senderId)).emit('receiveMessage', payload);
      io.to(String(receiverId)).emit('receiveMessage', payload);
    } catch (err) {
      console.error('Socket sendMessage error:', err);
    }
  });

  socket.on('typing', ({ receiver }) => {
    if (receiver) io.to(String(receiver)).emit('typing');
  });
  socket.on('stopTyping', ({ receiver }) => {
    if (receiver) io.to(String(receiver)).emit('stopTyping');
  });

  // ── Video Call Signaling ───────────────────────────────────────────
  // IMPORTANT: socket.userId can be undefined at call time, so client must send callerId
  socket.on('call-user', ({ to, offer, fromName, fromAvatar, callerId }) => {
    const from = callerId || socket.userId;
    if (to && from && offer) {
      console.log(`[call] ${from} calling ${to}`);
      io.to(String(to)).emit('incoming-call', {
        from,
        callerId: from,
        offer,
        fromName,
        fromAvatar,
      });
    }
  });

  socket.on('answer-call', ({ to, answer }) => {
    if (to && answer) {
      console.log(`[answer] answer sent to ${to}`);
      io.to(String(to)).emit('call-answered', { answer });
    }
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    if (to && candidate) {
      io.to(String(to)).emit('ice-candidate', { candidate });
    }
  });

  socket.on('end-call', ({ to }) => {
    if (to) {
      io.to(String(to)).emit('call-ended');
    }
  });

  socket.on('join', (userId) => {
    if (userId) {
      socket.userId = String(userId);
      socket.join(String(userId));
      console.log(`[socket] user ${userId} joined`);
    }
  });
});

// ── Routes ──────────────────────────────────────────────────────────
app.get('/', (_req, res) =>
  res.json({ 
    status: 'OK', 
    message: 'SkillSwap backend is running', 
    database: { ready: mongoose.connection.readyState === 1, mode: 'mongodb' } 
  })
);
app.get('/health', (_req, res) =>
  res.json({ status: 'ready', database: { ready: mongoose.connection.readyState === 1, mode: 'mongodb' } })
);

app.use('/auth', authRoutes);
app.use('/profile', userRoutes);
app.use('/users', userRoutes);
app.use('/connections', connectionRoutes);
app.use('/messages', messageRoutes);
const authMiddleware = require('./middleware/auth');
const connectionController = require('./controllers/connectionController');
app.use('/matches', authMiddleware, (req, res, next) => {
  // Redirect /matches to connections controller getMatches
  connectionController.getMatches(req, res, next);
});

// ── Catch-all: serve React for any non-API route ─────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// ── Start ───────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
});
