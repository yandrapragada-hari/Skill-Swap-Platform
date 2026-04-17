import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { LuArrowLeft, LuMapPin, LuClock, LuCalendar, LuStar, LuMessageSquare, LuSend, LuBookOpen, LuGraduationCap, LuCircleCheck, LuTarget, LuLinkedin, LuGithub, LuTwitter, LuGlobe, LuUsers, LuPencil, LuZap } from 'react-icons/lu';
import { formatDistanceToNow } from 'date-fns';

export default function UserProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [connectionCount, setConnectionCount] = useState(0);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/users/${userId}`);
        setUser(res.data.user);
        // connectionCount is now returned directly by getUserProfile backend
        setConnectionCount(res.data.user?.connectionCount || 0);
        // Fetch reviews for this user
        try {
          const revRes = await api.get(`/connections/reviews/${userId}`);
          setReviews(revRes.data.reviews || []);
        } catch { setReviews([]); }
      } catch {
        setUser(null);
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    };
    load();
  }, [userId]);

  const handleConnect = async () => {
    setSending(true);
    try {
      await api.post(`/connections/request/${userId}`);
      toast.success(`Connection request sent to ${user.name}!`);
      setSent(true);
    } catch (err) {
      toast.error(err.message || 'Failed to send request');
    } finally {
      setSending(false);
    }
  };

  const renderSkill = (skill) => {
    if (!skill) return null;
    if (typeof skill === 'string') return skill;
    return skill.name || skill;
  };

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: '60vh' }}>
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-primary mb-3"
        >
          <LuZap size={40} />
        </motion.div>
        <p className="text-muted fw-medium">Loading user profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-5 d-flex justify-content-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-5 text-center border-0 bg-white shadow-xl max-w-lg">
          <div className="display-1 mb-4 opacity-50">🕵️‍♂️</div>
          <h3 className="fw-bold text-dark mb-3">Member Not Found</h3>
          <p className="text-secondary mb-5 leading-relaxed">The person you're looking for might have moved on to new horizons or the link is incorrect.</p>
          <button onClick={() => navigate(-1)} className="btn btn-premium btn-premium-primary px-5">Go Back Home</button>
        </motion.div>
      </div>
    );
  }

  const isOwnProfile = me && (me.id === userId || me._id === userId);

  return (
    <div className="pb-5">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          
          <button 
            onClick={() => navigate(-1)} 
            className="btn btn-premium border bg-white text-secondary px-3 py-2 mb-5 d-flex align-items-center gap-2 shadow-sm hover:translate-x-n1"
          >
            <LuArrowLeft /> Back to Network
          </button>

          {/* User Profile Header Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card mb-5 border-0 bg-white shadow-lg overflow-hidden"
          >
            <div className="bg-primary-light h-32 w-100" style={{ height: '140px' }}></div>
            <div className="card-body p-4 p-md-5 pt-0">
              <div className="d-flex flex-column flex-md-row align-items-center align-items-md-end gap-5 mb-5" style={{ marginTop: '-70px' }}>
                <div className="position-relative">
                   <img 
                    src={user.avatar || "/default-avatar.png"} 
                    alt={user.name} 
                    className="rounded-circle border border-4 border-white shadow-2xl object-cover" 
                    width="160" 
                    height="160" 
                    />
                    <div className="position-absolute bottom-0 end-0 bg-primary p-2 rounded-circle border border-4 border-white mb-3 me-2" style={{ width: '28px', height: '28px' }}></div>
                </div>
                <div className="text-center text-md-start pb-2 flex-grow-1">
                  <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-md-start gap-4 mb-2">
                    <h2 className="fw-bold mb-0 display-5">{user.name}</h2>
                    <div className="bg-warning-light text-warning px-3 py-1 rounded-pill d-flex align-items-center gap-2 border border-warning-subtle fw-bold small">
                        <LuStar size={16} /> {user.rating?.toFixed(1) || 'No Rating'}
                    </div>
                  </div>
                  <p className="text-secondary fs-5 mb-0 opacity-75">{user.email || 'Private Member'}</p>
                </div>
                
                <div className="d-none d-xl-flex gap-3">
                    <div className="d-flex flex-column gap-2 text-center bg-light p-3 rounded-2xl border">
                        <h3 className="fw-bold mb-0 text-primary">{user.completedSwaps || 0}</h3>
                        <small className="text-muted fw-bold text-uppercase tracking-tighter" style={{ fontSize: '0.6rem' }}>Completed Swaps</small>
                    </div>
                    <div className="d-flex flex-column gap-2 text-center bg-light p-3 rounded-2xl border">
                        <h3 className="fw-bold mb-0 text-success">{connectionCount}</h3>
                        <small className="text-muted fw-bold text-uppercase tracking-tighter" style={{ fontSize: '0.6rem' }}>Connections</small>
                    </div>
                </div>
              </div>

              <div className="row g-4 mb-5">
                <div className="col-md-4">
                    <div className="d-flex align-items-center gap-3 p-3 rounded-xl bg-light border">
                        <div className="text-primary bg-primary-light p-2 rounded-lg"><LuBookOpen size={24} /></div>
                        <div>
                            <small className="text-muted d-block fw-bold text-uppercase tracking-wider" style={{ fontSize: '0.6rem' }}>Top Expertise</small>
                            <span className="fw-semibold">{user.teachSkills?.[0] || "International Member"}</span>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="d-flex align-items-center gap-3 p-3 rounded-xl bg-light border">
                        <div className="text-rose bg-rose-light p-2 rounded-lg"><LuClock size={24} /></div>
                        <div>
                            <small className="text-muted d-block fw-bold text-uppercase tracking-wider" style={{ fontSize: '0.6rem' }}>Availability</small>
                            <span className="fw-semibold">{user.availability || "Flexible Hours"}</span>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="d-flex align-items-center gap-3 p-3 rounded-xl bg-light border">
                        <div className="text-cyan bg-cyan-light p-2 rounded-lg"><LuCalendar size={24} /></div>
                        <div>
                            <small className="text-muted d-block fw-bold text-uppercase tracking-wider" style={{ fontSize: '0.6rem' }}>Member since</small>
                            <span className="fw-semibold">{new Date(user.createdAt).getFullYear()}</span>
                        </div>
                    </div>
                </div>
              </div>

              {user.bio && (
                  <div className="bg-light p-4 p-md-5 rounded-2xl mb-5 border">
                      <h5 className="fw-bold mb-4 text-dark text-uppercase tracking-widest" style={{ fontSize: '0.75rem' }}>About {user.name.split(' ')[0]}</h5>
                      <p className="text-secondary leading-relaxed fs-5 mb-0">{user.bio}</p>
                  </div>
              )}

              {/* Action Buttons & Social */}
              <div className="d-flex flex-wrap align-items-center justify-content-between p-4 bg-primary-light rounded-3xl gap-4 border border-primary-subtle">
                <div className="d-flex gap-4">
                    {user.socialLinks?.linkedin && <a href={user.socialLinks.linkedin} target="_blank" rel="noreferrer" className="text-primary hover:scale-110 transition-transform"><LuLinkedin size={28} /></a>}
                    {user.socialLinks?.github && <a href={user.socialLinks.github} target="_blank" rel="noreferrer" className="text-dark hover:scale-110 transition-transform"><LuGithub size={28} /></a>}
                    {user.socialLinks?.twitter && <a href={user.socialLinks.twitter} target="_blank" rel="noreferrer" className="text-info hover:scale-110 transition-transform"><LuTwitter size={28} /></a>}
                    {user.socialLinks?.website && <a href={user.socialLinks.website} target="_blank" rel="noreferrer" className="text-secondary hover:scale-110 transition-transform"><LuGlobe size={28} /></a>}
                </div>

                {!isOwnProfile ? (
                    <div className="d-flex gap-3">
                        <Link to={`/messages/${[me?.id || me?._id, userId].sort().join('_')}`} className="btn btn-premium border bg-white text-primary px-4 py-3 shadow-none fw-bold fs-6">
                            <LuMessageSquare className="me-2" /> Message
                        </Link>
                        <button
                            onClick={handleConnect}
                            disabled={sending || sent}
                            className={`btn btn-premium btn-premium-primary px-5 py-3 shadow-lg fs-6 ${sent ? 'bg-success border-0 px-4' : ''}`}
                        >
                            {sent ? <LuCircleCheck className="me-2" /> : sending ? <span className="spinner-border spinner-border-sm me-2"></span> : <LuSend className="me-2" />}
                            {sent ? 'Requested' : sending ? 'Sending...' : 'Connect to Swap'}
                        </button>
                    </div>
                ) : (
                    <Link to="/profile/edit" className="btn btn-premium btn-premium-primary px-5 py-3 shadow-lg fs-6">
                        <LuPencil className="me-2" /> Optimize My Profile
                    </Link>
                )}
              </div>
            </div>
          </motion.div>

          {/* Detailed Skills Display */}
          <div className="row g-5">
            <div className="col-md-12">
                <div className="d-flex align-items-center gap-3 mb-5 mt-4">
                    <div className="bg-primary p-2 rounded-lg text-white d-flex align-items-center justify-content-center shadow-lg">
                        <LuBookOpen size={24} />
                    </div>
                    <h3 className="fw-bold mb-0 tracking-tight">Expertise & Learning Goals</h3>
                </div>
            </div>
            
            <div className="col-md-6 mb-5">
              <motion.div 
                whileHover={{ y: -8 }}
                className="glass-card h-100 shadow-lg bg-white p-4 p-md-5 rounded-4 position-relative overflow-hidden border border-primary-subtle"
              >
                <div className="position-absolute top-0 start-0 w-100 bg-primary" style={{ height: '6px' }}></div>
                <div className="d-flex align-items-center gap-3 mb-4">
                    <div className="bg-primary-light text-primary p-3 rounded-circle shadow-sm border border-primary-subtle"><LuBookOpen size={28} /></div>
                    <h4 className="fw-bold mb-0 fs-5">Can Teach You</h4>
                </div>
                <div className="d-flex flex-wrap gap-2 pt-2">
                    {user.teachSkills?.length > 0 ? (
                        user.teachSkills.map((s, idx) => (
                        <span key={idx} className="skill-tag skill-tag-teach flex-grow-1 justify-content-center py-2 px-4 shadow-sm fw-bold rounded-pill border border-primary-subtle bg-white text-primary">
                            <LuCircleCheck size={16} className="text-success" /> {renderSkill(s)}
                        </span>
                        ))
                    ) : (
                        <div className="text-secondary fst-italic py-3 bg-light rounded-3 w-100 text-center border">No expertise shared yet.</div>
                    )}
                </div>
              </motion.div>
            </div>
            
            <div className="col-md-6 mb-5">
               <motion.div 
                whileHover={{ y: -8 }}
                className="glass-card h-100 shadow-lg bg-white p-4 p-md-5 rounded-4 position-relative overflow-hidden border border-success-subtle"
              >
                <div className="position-absolute top-0 start-0 w-100 bg-success" style={{ height: '6px' }}></div>
                <div className="d-flex align-items-center gap-3 mb-4">
                    <div className="bg-success-light text-success p-3 rounded-circle shadow-sm border border-success-subtle"><LuGraduationCap size={28} /></div>
                    <h4 className="fw-bold mb-0 fs-5">Wants to Master</h4>
                </div>
                <div className="d-flex flex-wrap gap-2 pt-2">
                    {user.learnSkills?.length > 0 ? (
                        user.learnSkills.map((s, idx) => (
                        <span key={idx} className="skill-tag skill-tag-learn flex-grow-1 justify-content-center py-2 px-4 shadow-sm fw-bold rounded-pill border border-success-subtle bg-white text-success">
                            <LuTarget size={16} className="text-warning" /> {renderSkill(s)}
                        </span>
                        ))
                    ) : (
                        <div className="text-secondary fst-italic py-3 bg-light rounded-3 w-100 text-center border">No learning goals shared yet.</div>
                    )}
                </div>
              </motion.div>
            </div>
          </div>

          {/* Reviews Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-5"
          >
            <div className="d-flex align-items-center gap-3 mb-4">
              <div className="bg-warning p-2 rounded-lg text-white d-flex align-items-center justify-content-center shadow-lg">
                <LuStar size={24} />
              </div>
              <div>
                <h3 className="fw-bold mb-0">Community Reviews</h3>
                <p className="text-muted small mb-0">{reviews.length} review{reviews.length !== 1 ? 's' : ''} from swap partners</p>
              </div>
            </div>

            {reviews.length === 0 ? (
              <div className="glass-card bg-white border-0 p-5 text-center">
                <div className="mx-auto bg-light rounded-circle d-flex align-items-center justify-content-center mb-3" style={{ width: '64px', height: '64px' }}>
                  <LuStar size={28} className="text-muted" />
                </div>
                <p className="text-muted fw-medium mb-0">No reviews yet. Complete a skill swap to receive your first review!</p>
              </div>
            ) : (
              <div className="row g-4">
                {reviews.map((review, idx) => (
                  <div key={review._id || idx} className="col-md-6">
                    <motion.div
                      whileHover={{ y: -3 }}
                      className="glass-card bg-white border border-light shadow-md p-4 h-100 rounded-4"
                    >
                      <div className="d-flex align-items-center gap-3 mb-3">
                        <img
                          src={review.reviewer?.avatar || '/default-avatar.png'}
                          alt={review.reviewer?.name}
                          width="48" height="48"
                          className="rounded-circle border shadow-sm"
                        />
                        <div className="flex-grow-1">
                          <p className="fw-bold mb-0 text-dark">{review.reviewer?.name || 'Anonymous'}</p>
                          <p className="text-muted small mb-0">
                            {review.createdAt ? formatDistanceToNow(new Date(review.createdAt), { addSuffix: true }) : ''}
                          </p>
                        </div>
                        <div className="d-flex gap-1">
                          {[1,2,3,4,5].map(s => (
                            <LuStar
                              key={s}
                              size={16}
                              className={s <= review.rating ? 'text-warning' : 'text-muted opacity-25'}
                              fill={s <= review.rating ? '#f59e0b' : 'none'}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-secondary mb-0 fst-italic border-start border-4 border-warning ps-3">
                          "{review.comment}"
                        </p>
                      )}
                    </motion.div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
}
