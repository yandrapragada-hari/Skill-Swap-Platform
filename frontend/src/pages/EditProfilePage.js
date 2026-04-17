import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { LuUser, LuMapPin, LuClock, LuGlobe, LuLinkedin, LuGithub, LuTwitter, LuSave, LuCircleX, LuBookOpen, LuGraduationCap } from 'react-icons/lu';

const InputGroup = ({ label, icon: Icon, children }) => (
  <div className="mb-4">
    <label className="form-label fw-bold text-dark d-flex align-items-center gap-2 mb-2">
      <Icon size={18} className="text-primary" /> {label}
    </label>
    {children}
  </div>
);

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    availability: '',
    bio: '',
    teachSkills: '',
    learnSkills: '',
    linkedin: '',
    github: '',
    twitter: '',
    website: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFormData({
      name: user.name || '',
      location: user.location || '',
      availability: user.availability || '',
      bio: user.bio || '',
      teachSkills: (user.teachSkills || []).join(', '),
      learnSkills: (user.learnSkills || []).join(', '),
      linkedin: user.socialLinks?.linkedin || '',
      github: user.socialLinks?.github || '',
      twitter: user.socialLinks?.twitter || '',
      website: user.socialLinks?.website || '',
    });
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.put('/profile', {
        name: formData.name,
        location: formData.location,
        availability: formData.availability,
        bio: formData.bio,
        teachSkills: formData.teachSkills,
        learnSkills: formData.learnSkills,
        linkedin: formData.linkedin,
        github: formData.github,
        twitter: formData.twitter,
        website: formData.website,
      });

      updateUser(res.data.user);
      toast.success('Profile updated successfully');
      navigate('/profile');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-5">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="d-flex justify-content-between align-items-center mb-5">
            <div>
                <h1 className="fw-bold mb-1">Edit Profile</h1>
                <p className="text-secondary mb-0">Refine your expert profile to attract better matches.</p>
            </div>
            <button 
                type="button" 
                onClick={() => navigate('/profile')} 
                className="btn btn-premium border bg-white text-secondary px-4 d-flex align-items-center gap-2 shadow-sm"
            >
              <LuCircleX /> Discard
            </button>
          </div>

          <motion.form 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit} 
            className="glass-card border-0 p-4 p-md-5 bg-white shadow-lg"
          >
            <div className="row g-4 mb-5">
                <div className="col-12">
                     <h5 className="fw-bold mb-4 d-flex align-items-center gap-2 text-primary">
                        <LuUser /> Personal Information
                    </h5>
                </div>
              <div className="col-md-6">
                <InputGroup label="Full Name" icon={LuUser}>
                    <input
                        type="text"
                        className="form-control form-control-lg border-0 bg-light rounded-xl px-4"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                </InputGroup>
              </div>
              <div className="col-md-6">
                <InputGroup label="Location" icon={LuMapPin}>
                    <input
                        type="text"
                        className="form-control form-control-lg border-0 bg-light rounded-xl px-4"
                        placeholder="e.g. New York, USA"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                </InputGroup>
              </div>
              <div className="col-md-6">
                <InputGroup label="Availability" icon={LuClock}>
                    <input
                        type="text"
                        className="form-control form-control-lg border-0 bg-light rounded-xl px-4"
                        placeholder="e.g. Weekends, Evenings"
                        value={formData.availability}
                        onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                    />
                </InputGroup>
              </div>
              <div className="col-md-6">
                <InputGroup label="Portfolio Website" icon={LuGlobe}>
                    <input
                        type="url"
                        className="form-control form-control-lg border-0 bg-light rounded-xl px-4"
                        placeholder="https://yourwebsite.com"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    />
                </InputGroup>
              </div>
              <div className="col-12">
                <InputGroup label="Short Bio" icon={LuUser}>
                    <textarea
                        rows={4}
                        className="form-control border-0 bg-light rounded-xl px-4 py-3"
                        placeholder="Share your expertise and interests..."
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    />
                </InputGroup>
              </div>
            </div>

            <div className="row g-4 mb-5 pt-4 border-top">
                <div className="col-12">
                     <h5 className="fw-bold mb-4 d-flex align-items-center gap-2 text-rose">
                        <LuBookOpen /> Skills & Expertise
                    </h5>
                </div>
              <div className="col-md-6">
                <InputGroup label="Skills You Can Teach" icon={LuBookOpen}>
                    <input
                        type="text"
                        className="form-control form-control-lg border-0 bg-light rounded-xl px-4"
                        placeholder="React, Python, Design..."
                        value={formData.teachSkills}
                        onChange={(e) => setFormData({ ...formData, teachSkills: e.target.value })}
                    />
                    <small className="text-muted mt-2 d-block">Separate skills with commas</small>
                </InputGroup>
              </div>
              <div className="col-md-6">
                <InputGroup label="Skills You Want to Learn" icon={LuGraduationCap}>
                    <input
                        type="text"
                        className="form-control form-control-lg border-0 bg-light rounded-xl px-4"
                        placeholder="Spanish, Yoga, Figma..."
                        value={formData.learnSkills}
                        onChange={(e) => setFormData({ ...formData, learnSkills: e.target.value })}
                    />
                    <small className="text-muted mt-2 d-block">Separate skills with commas</small>
                </InputGroup>
              </div>
            </div>

            <div className="row g-4 mb-5 pt-4 border-top">
                <div className="col-12">
                     <h5 className="fw-bold mb-4 d-flex align-items-center gap-2 text-cyan">
                        <LuGlobe /> Social Profiles
                    </h5>
                </div>
              <div className="col-md-4">
                <InputGroup label="LinkedIn" icon={LuLinkedin}>
                    <input
                        type="url"
                        className="form-control border-0 bg-light rounded-xl px-4"
                        placeholder="LinkedIn Profile URL"
                        value={formData.linkedin}
                        onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    />
                </InputGroup>
              </div>
              <div className="col-md-4">
                <InputGroup label="GitHub" icon={LuGithub}>
                    <input
                        type="url"
                        className="form-control border-0 bg-light rounded-xl px-4"
                        placeholder="GitHub Username/Link"
                        value={formData.github}
                        onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                    />
                </InputGroup>
              </div>
              <div className="col-md-4">
                <InputGroup label="Twitter" icon={LuTwitter}>
                    <input
                        type="url"
                        className="form-control border-0 bg-light rounded-xl px-4"
                        placeholder="Twitter Profile URL"
                        value={formData.twitter}
                        onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                    />
                </InputGroup>
              </div>
            </div>

            <div className="d-flex gap-3 justify-content-end pt-5 border-top">
              <button 
                type="button" 
                onClick={() => navigate('/profile')} 
                className="btn btn-premium border bg-white px-5 py-3 fw-bold"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-premium btn-premium-primary px-5 py-3 shadow-lg fs-6" 
                disabled={loading}
              >
                {loading ? (
                    <span className="spinner-border spinner-border-sm me-2"></span>
                ) : (
                    <LuSave size={20} />
                )}
                Save Account Updates
              </button>
            </div>
          </motion.form>
        </div>
      </div>
    </div>
  );
}
