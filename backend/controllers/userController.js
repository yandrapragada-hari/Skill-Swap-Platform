const fs = require('fs');
const path = require('path');
const multer = require('multer');
const User = require('../models/User');
const Connection = require('../models/Connection');
const { sanitizeUser } = require('./authController');

const uploadPath = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.user.id}-${Date.now()}${ext}`);
  },
});

const avatarUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const deleteLocalAvatar = async (avatarUrl, req) => {
  if (!avatarUrl) return;
  const uploadUrlPrefix = `${req.protocol}://${req.get('host')}/uploads/`;
  if (!avatarUrl.startsWith(uploadUrlPrefix)) return;

  try {
    const parsedUrl = new URL(avatarUrl);
    const filename = path.basename(parsedUrl.pathname);
    const filePath = path.join(uploadPath, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    console.error('Failed to delete old avatar file:', error);
  }
};

exports.uploadAvatar = (req, res) => {
  avatarUpload.single('avatar')(req, res, async (err) => {
    if (err) {
      console.error('Avatar upload error:', err);
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Image too large. Upload a file under 2MB.'
        : err.message || 'Error uploading avatar';
      return res.status(400).json({ message });
    }
    if (!req.file) return res.status(400).json({ message: 'Avatar file is required' });

    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const oldAvatar = user.avatar;
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      user.avatar = fileUrl;
      await user.save();
      await deleteLocalAvatar(oldAvatar, req);

      return res.json({ user: sanitizeUser(user) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Unable to save avatar' });
    }
  });
};

exports.deleteAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const oldAvatar = user.avatar;
    user.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=1a9e8f&color=fff`;
    await user.save();
    await deleteLocalAvatar(oldAvatar, req);

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error('Avatar delete error:', error);
    return res.status(500).json({ message: 'Unable to remove avatar' });
  }
};

const normalizeSkillList = (value) => {
  if (Array.isArray(value)) return value.map((s) => String(s).trim()).filter(Boolean);
  return String(value || '').split(',').map((s) => s.trim()).filter(Boolean);
};

exports.updateProfile = async (req, res) => {
  try {
    const existing = await User.findById(req.user.id);
    if (!existing) return res.status(404).json({ message: 'User not found' });

    const updates = {
      name: req.body.name !== undefined ? String(req.body.name).trim() : existing.name,
      location: req.body.location !== undefined ? String(req.body.location).trim() : existing.location,
      availability: req.body.availability !== undefined ? String(req.body.availability).trim() : existing.availability,
      bio: req.body.bio !== undefined ? String(req.body.bio).trim() : existing.bio,
      teachSkills: req.body.teachSkills !== undefined ? normalizeSkillList(req.body.teachSkills) : existing.teachSkills,
      learnSkills: req.body.learnSkills !== undefined ? normalizeSkillList(req.body.learnSkills) : existing.learnSkills,
      socialLinks: {
        linkedin: req.body.linkedin !== undefined ? String(req.body.linkedin).trim() : existing.socialLinks?.linkedin || '',
        github: req.body.github !== undefined ? String(req.body.github).trim() : existing.socialLinks?.github || '',
        twitter: req.body.twitter !== undefined ? String(req.body.twitter).trim() : existing.socialLinks?.twitter || '',
        website: req.body.website !== undefined ? String(req.body.website).trim() : existing.socialLinks?.website || '',
      },
    };

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unable to update profile' });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Count all active connections (accepted or completed) for this user
    const connectionCount = await Connection.countDocuments({
      status: { $in: ['accepted', 'completed'] },
      $or: [{ requester: user._id }, { recipient: user._id }],
    });

    console.log(`Profile: ${user.name} has ${connectionCount} connections`);

    const sanitized = sanitizeUser(user);
    return res.json({ user: { ...sanitized, connectionCount } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Unable to load user' });
  }
};
