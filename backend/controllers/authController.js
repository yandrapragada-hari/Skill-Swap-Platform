const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'skill-swap-secret';

const createToken = (userId) =>
  jwt.sign({ userId: String(userId) }, JWT_SECRET, { expiresIn: '7d' });

const sanitizeUser = (user) => {
  if (!user) return null;
  const obj = user.toObject ? user.toObject() : { ...user };
  obj.id = String(obj._id);
  delete obj.password;
  delete obj.__v;
  return obj;
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email, and password are required' });

    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a9e8f&color=fff`,
    });

    const token = createToken(user._id);
    return res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unable to register user' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = createToken(user._id);
    return res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unable to login' });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const token = createToken(req.user.id);
    return res.json({ token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unable to generate token' });
  }
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id);
  return res.json({ user: sanitizeUser(user) });
};

// Exporting helpers for other controllers
exports.sanitizeUser = sanitizeUser;
