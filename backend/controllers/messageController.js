const Message = require('../models/Message');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sanitizeUser } = require('./authController');

const hydrateMessage = (msg) => {
  return {
    id: String(msg._id),
    _id: String(msg._id),
    conversationId: msg.conversationId,
    conversation: msg.conversationId,
    content: msg.content,
    sender: msg.sender ? sanitizeUser(msg.sender) : null,
    receiver: msg.receiver ? sanitizeUser(msg.receiver) : null,
    createdAt: msg.createdAt,
    read: msg.read,
    fileUrl: msg.fileUrl,
    fileName: msg.fileName,
    fileType: msg.fileType,
    fileSize: msg.fileSize,
  };
};

const conversationIdFromUsers = (a, b) =>
  [String(a), String(b)].sort().join('_');

exports.getConversations = async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.user.id }, { receiver: req.user.id }],
    })
      .populate('sender', '-password')
      .populate('receiver', '-password')
      .sort({ createdAt: -1 });

    const conversations = {};
    messages.forEach((msg) => {
      const hydrated = hydrateMessage(msg);
      const convId = hydrated.conversationId;

      if (!conversations[convId]) {
        const peer = hydrated.sender?.id === req.user.id ? hydrated.receiver : hydrated.sender;
        conversations[convId] = {
          id: convId,
          participant: peer,
          lastMessage: { content: hydrated.content },
          lastMessageAt: hydrated.createdAt,
          unreadCount: 0,
        };
      }

      if (hydrated.receiver?.id === req.user.id && !hydrated.read) {
        conversations[convId].unreadCount += 1;
      }
    });

    return res.json({ conversations: Object.values(conversations) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unable to load conversations' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ conversationId: req.params.conversationId })
      .populate('sender', '-password')
      .populate('receiver', '-password')
      .sort({ createdAt: 1 });

    return res.json({ messages: messages.map(hydrateMessage) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unable to load messages' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;
    const otherId = conversationId.split('_').find((id) => id !== String(req.user.id));

    if (!otherId) return res.status(400).json({ message: 'Invalid conversation id' });

    const receiver = await User.findById(otherId);
    if (!receiver) return res.status(404).json({ message: 'Receiver not found' });
    
    // relax content required if it's just a text message, but we'll handle files separately in uploadFile
    // for standard sendMessage, content is still usually expected unless we allow empty text with files
    if (!String(content || '').trim())
      return res.status(400).json({ message: 'Message content is required' });

    const normalizedConversationId = conversationIdFromUsers(req.user.id, receiver._id);

    let message = await Message.create({
      conversationId: normalizedConversationId,
      participants: [req.user.id, receiver._id],
      sender: req.user.id,
      receiver: receiver._id,
      content: String(content).trim(),
      read: false,
    });

    message = await Message.findById(message._id)
      .populate('sender', '-password')
      .populate('receiver', '-password');

    const payload = hydrateMessage(message);
    
    //io is handled in server.js, usually via a global or passed object.
    //For now, we emit in the route handler or server.js logic.
    if (req.io) {
       req.io.to(String(receiver._id)).emit('receiveMessage', payload);
    }

    return res.status(201).json({ message: payload });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unable to send message' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    await Message.updateMany(
      { conversationId: req.params.conversationId, receiver: req.user.id, read: false },
      { read: true }
    );
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unable to mark messages as read' });
  }
};

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).single('file');

exports.uploadFile = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error('File upload error:', err);
      return res.status(400).json({ message: 'Error uploading file' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please select a file' });
    }

    try {
      const { conversationId } = req.params;
      const otherId = conversationId.split('_').find((id) => id !== String(req.user.id));
      
      const receiver = await User.findById(otherId);
      if (!receiver) return res.status(404).json({ message: 'Receiver not found' });

      const normalizedConversationId = conversationIdFromUsers(req.user.id, receiver._id);

      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

      let message = await Message.create({
        conversationId: normalizedConversationId,
        participants: [req.user.id, receiver._id],
        sender: req.user.id,
        receiver: receiver._id,
        content: req.body.content || '',
        fileUrl: fileUrl,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        read: false,
      });

      message = await Message.findById(message._id)
        .populate('sender', '-password')
        .populate('receiver', '-password');

      const payload = hydrateMessage(message);
      
      if (req.io) {
         req.io.to(String(receiver._id)).emit('receiveMessage', payload);
         req.io.to(String(req.user.id)).emit('receiveMessage', payload);
      }

      return res.status(201).json({ message: payload });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Unable to send file message' });
    }
  });
};

exports.hydrateMessage = hydrateMessage;
exports.conversationIdFromUsers = conversationIdFromUsers;
