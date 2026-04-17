const express = require('express');
const { protect } = require('../middleware/auth');
const router = express.Router();

const SKILL_CATEGORIES = {
  Technology: ['JavaScript', 'Python', 'React', 'Node.js', 'Java', 'C++', 'Swift', 'Kotlin', 'Go', 'Rust', 'TypeScript', 'Vue.js', 'Angular', 'Django', 'Flask', 'Ruby on Rails', 'PHP', 'SQL', 'MongoDB', 'PostgreSQL', 'Docker', 'Kubernetes', 'AWS', 'DevOps', 'Machine Learning', 'Data Science', 'Cybersecurity', 'Blockchain', 'Unity', 'Unreal Engine'],
  Design: ['UI/UX Design', 'Figma', 'Adobe XD', 'Photoshop', 'Illustrator', 'Graphic Design', 'Motion Design', 'Brand Design', 'Typography', '3D Modeling', 'Blender', 'Video Editing', 'Premiere Pro', 'After Effects'],
  Business: ['Marketing', 'SEO', 'Content Writing', 'Copywriting', 'Social Media', 'Email Marketing', 'Sales', 'Business Strategy', 'Product Management', 'Agile', 'Scrum', 'Finance', 'Accounting', 'Excel'],
  Creative: ['Photography', 'Drawing', 'Painting', 'Music Production', 'Guitar', 'Piano', 'Singing', 'Filmmaking', 'Storytelling', 'Creative Writing', 'Podcast Production'],
  Languages: ['English', 'Spanish', 'French', 'German', 'Mandarin', 'Japanese', 'Arabic', 'Portuguese', 'Hindi', 'Italian'],
  Lifestyle: ['Yoga', 'Meditation', 'Cooking', 'Fitness Training', 'Nutrition', 'Public Speaking', 'Leadership', 'Time Management', 'Chess']
};

router.get('/categories', protect, (req, res) => {
  res.json({ success: true, categories: SKILL_CATEGORIES });
});

router.get('/popular', protect, async (req, res) => {
  const User = require('../models/User');
  try {
    const users = await User.find({ isActive: true }).select('teachSkills learnSkills');
    const skillCount = {};
    users.forEach(u => {
      [...u.teachSkills, ...u.learnSkills].forEach(s => {
        skillCount[s.name] = (skillCount[s.name] || 0) + 1;
      });
    });
    const popular = Object.entries(skillCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ name, count }));
    res.json({ success: true, skills: popular });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;