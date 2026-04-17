import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { LuUser, LuMapPin, LuCalendar, LuStar, LuPencil, LuBookOpen, LuGraduationCap, LuCircleCheck, LuZap } from 'react-icons/lu';

export default function ProfilePage() {
  const { user } = useAuth();

  const renderSkill = (skill) => {
    if (!skill) return null;
    if (typeof skill === 'string') return skill;
    return skill.name || skill;
  };

  if (!user) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: '60vh' }}>
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-primary mb-3"
        >
          <LuZap size={40} />
        </motion.div>
        <p className="text-muted fw-medium">Loading profile...</p>
      </div>
    );
  }

  const profileStats = [
    { label: 'Completed Swaps', value: user.completedSwaps || 0, color: 'text-primary' },
    { label: 'Teaching', value: user.teachSkills?.length || 0, color: 'text-rose' },
    { label: 'Learning', value: user.learnSkills?.length || 0, color: 'text-cyan' },
    { label: 'Rating', value: user.rating?.toFixed(1) || '0.0', color: 'text-warning' },
  ];

  return (
    <div className="pb-5">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          
          <div className="d-flex justify-content-between align-items-center mb-5">
            <div>
                <h1 className="fw-bold mb-1">My Profile</h1>
                <p className="text-secondary mb-0">Manage your public presence and expert identity.</p>
            </div>
            <Link to="/profile/edit" className="btn btn-premium btn-premium-primary text-white shadow">
              <LuPencil /> Edit Profile
            </Link>
          </div>

          {/* Profile Header Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card mb-5 border-0 bg-white shadow-lg overflow-hidden"
          >
            <div className="bg-primary-light h-32 w-100" style={{ height: '120px' }}></div>
            <div className="card-body p-4 p-md-5 pt-0">
              <div className="d-flex flex-column flex-md-row align-items-center align-items-md-end gap-4 mb-5" style={{ marginTop: '-60px' }}>
                <div className="position-relative">
                   <img 
                    src={user.avatar || "/default-avatar.png"} 
                    alt={user.name} 
                    className="rounded-circle border border-4 border-white shadow-xl object-cover" 
                    width="140" 
                    height="140" 
                    />
                    <div className="position-absolute bottom-0 end-0 bg-success p-1 rounded-circle border border-white mb-2 me-1" style={{ width: '20px', height: '20px' }}></div>
                </div>
                <div className="text-center text-md-start pb-2">
                  <h2 className="fw-bold mb-1 display-6">{user.name}</h2>
                  <p className="text-secondary fs-5 mb-0">{user.email}</p>
                </div>
              </div>

              <div className="row g-4 mb-5">
                <div className="col-md-4">
                    <div className="d-flex align-items-center gap-3 p-3 rounded-xl bg-light border">
                        <div className="text-primary bg-primary-light p-2 rounded-lg"><LuBookOpen size={24} /></div>
                        <div>
                            <small className="text-muted d-block fw-bold text-uppercase tracking-wider" style={{ fontSize: '0.6rem' }}>Primary Skill</small>
                            <span className="fw-semibold">{user.teachSkills?.[0] || "Expert Member"}</span>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="d-flex align-items-center gap-3 p-3 rounded-xl bg-light border">
                        <div className="text-rose bg-rose-light p-2 rounded-lg"><LuCalendar size={24} /></div>
                        <div>
                            <small className="text-muted d-block fw-bold text-uppercase tracking-wider" style={{ fontSize: '0.6rem' }}>Joined</small>
                            <span className="fw-semibold">{new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="d-flex align-items-center gap-3 p-3 rounded-xl bg-light border">
                        <div className="text-warning bg-warning-light p-2 rounded-lg"><LuStar size={24} /></div>
                        <div>
                            <small className="text-muted d-block fw-bold text-uppercase tracking-wider" style={{ fontSize: '0.6rem' }}>Rating</small>
                            <span className="fw-semibold">{user.rating?.toFixed(1) || '0.0'} ({user.totalRatings || 0} Reviews)</span>
                        </div>
                    </div>
                </div>
              </div>

              {user.bio && (
                  <div className="bg-light p-4 rounded-xl mb-5">
                      <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                        <LuUser className="text-primary" /> About Me
                      </h5>
                      <p className="text-secondary leading-relaxed mb-0">{user.bio}</p>
                  </div>
              )}

              <div className="d-flex flex-wrap gap-5 justify-content-center justify-content-md-start">
                  {profileStats.map(s => (
                      <div key={s.label} className="text-center">
                          <h3 className={`fw-bold mb-0 display-6 ${s.color}`}>{s.value}</h3>
                          <small className="text-muted fw-semibold text-uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>{s.label}</small>
                      </div>
                  ))}
              </div>
            </div>
          </motion.div>

          <div className="row g-4">
            <div className="col-md-6">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card h-100 border-0 shadow bg-white p-4 p-md-5"
              >
                <div className="d-flex align-items-center gap-3 mb-4">
                    <div className="bg-primary-light text-primary p-3 rounded-circle"><LuBookOpen size={28} /></div>
                    <h4 className="fw-bold mb-0">I Can Teach</h4>
                </div>
                <div className="d-flex flex-wrap gap-3">
                    {user.teachSkills?.length > 0 ? (
                        user.teachSkills.map((s, idx) => (
                        <span key={idx} className="skill-tag skill-tag-teach flex-grow-1 justify-content-center py-2 px-4 shadow-sm">
                            <LuCircleCheck size={16} /> {renderSkill(s)}
                        </span>
                        ))
                    ) : (
                        <div className="text-center w-100 py-3 text-muted fst-italic">No teaching skills shared yet.</div>
                    )}
                </div>
              </motion.div>
            </div>
            
            <div className="col-md-6">
               <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card h-100 border-0 shadow bg-white p-4 p-md-5"
              >
                <div className="d-flex align-items-center gap-3 mb-4">
                    <div className="bg-success-light text-success p-3 rounded-circle"><LuGraduationCap size={28} /></div>
                    <h4 className="fw-bold mb-0">I Want to Learn</h4>
                </div>
                <div className="d-flex flex-wrap gap-3">
                    {user.learnSkills?.length > 0 ? (
                        user.learnSkills.map((s, idx) => (
                        <span key={idx} className="skill-tag skill-tag-learn flex-grow-1 justify-content-center py-2 px-4 shadow-sm">
                            <LuGraduationCap size={16} /> {renderSkill(s)}
                        </span>
                        ))
                    ) : (
                        <div className="text-center w-100 py-3 text-muted fst-italic">No learning goals added yet.</div>
                    )}
                </div>
              </motion.div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}