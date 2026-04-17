const User = require('../models/User');
const Connection = require('../models/Connection');
const { sanitizeUser } = require('./authController');

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
