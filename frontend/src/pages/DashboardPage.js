import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import MatchCard from '../components/MatchCard';
import { motion, AnimatePresence } from 'framer-motion';
import { LuTarget, LuUsers, LuMail, LuStar, LuArrowRight, LuInfo, LuCheck, LuX, LuZap, LuRepeat } from 'react-icons/lu';

export default function DashboardPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [pending, setPending] = useState({ incoming: [], outgoing: [] });
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [mRes, pRes, cRes] = await Promise.all([
        api.get('/matches'),
        api.get('/connections/pending'),
        api.get('/connections')
      ]);

      setMatches(mRes.data.matches?.slice(0, 4) || []);
      setPending(pRes.data || { incoming: [], outgoing: [] });
      setConnections(cRes.data.connections?.slice(0, 4) || []);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setTimeout(() => setLoading(false), 500); // Smooth transition
    }
  };

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  const needsSkills = !(user?.teachSkills?.length > 0 || user?.learnSkills?.length > 0);

  const handleRespond = async (id, status) => {
    try {
      await api.put(`/connections/${id}/respond`, { status });
      setPending(prev => ({
        ...prev,
        incoming: prev.incoming.filter(c => c._id !== id)
      }));
      if (status === 'accepted') {
        const cRes = await api.get('/connections');
        setConnections(cRes.data.connections?.slice(0, 4) || []);
      }
    } catch (err) {
      console.error("Action failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: '60vh' }}>
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-primary mb-3"
        >
          <LuZap size={48} />
        </motion.div>
        <p className="text-muted fw-medium">Curating your matches...</p>
      </div>
    );
  }

  const stats = [
    { label: 'Matches', value: matches.length, icon: LuTarget, color: 'text-primary', bg: 'bg-primary-light' },
    { label: 'Connections', value: connections.length, icon: LuUsers, color: 'text-success', bg: 'bg-success-light' },
    { label: 'Swaps Done', value: user?.completedSwaps || 0, icon: LuRepeat, color: 'text-info', bg: 'bg-info-light' },
    { label: 'Rating', value: user?.rating?.toFixed(1) || '0.0', icon: LuStar, color: 'text-warning', bg: 'bg-warning-light' },
  ];

  return (
    <div className="pb-5">
      {/* Welcome Hero */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden position-relative mb-5 border-0 shadow-lg"
        style={{ background: 'linear-gradient(135deg, #2563EB 0%, #10B981 100%)' }}
      >
        <div className="card-body p-4 p-md-5 text-white position-relative">
          <div className="position-relative z-1">
            <h1 className="display-5 fw-bold mb-3">Welcome back, {user?.name?.split(' ')[0]}!</h1>
            <p className="fs-5 opacity-90 mb-4 max-w-xl">
              {needsSkills
                ? 'Your journey to sharing knowledge starts with a complete profile.'
                : `We found ${matches.length} incredible matches that share your passions.`}
            </p>
            <Link 
              to={needsSkills ? "/profile/edit" : "/matches"} 
              className="btn btn-light btn-lg px-4 fw-bold rounded-pill text-primary d-inline-flex align-items-center gap-2"
            >
              {needsSkills ? "Complete Profile" : "Explore Matches"}
              <LuArrowRight />
            </Link>
          </div>
          {/* Decorative shapes - Hidden on mobile for cleaner look and to prevent scroll issues */}
          <div className="position-absolute top-0 end-0 p-5 mt-n5 me-n5 opacity-10 d-none d-md-block pointer-events-none">
            <LuUsers size={300} />
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="row g-4 mb-5">
        {stats.map((s, idx) => (
          <motion.div 
            key={s.label} 
            className="col-6 col-lg-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <div className="glass-card glass-card-hover border-0 p-4 text-center h-100">
              <div className={`mx-auto rounded-circle d-flex align-items-center justify-content-center mb-3 ${s.bg}`} style={{ width: '56px', height: '56px' }}>
                <s.icon size={24} className={s.color} />
              </div>
              <h2 className="fw-bold mb-1">{s.value}</h2>
              <p className="text-muted small fw-medium mb-0">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          {/* Connection Requests */}
          <AnimatePresence>
            {pending.incoming?.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mb-5"
              >
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h3 className="h4 fw-bold mb-0">Connection Requests</h3>
                  <Link to="/connections" className="text-primary fw-semibold small text-decoration-none">View All</Link>
                </div>
                <div className="glass-card overflow-hidden border-0">
                  <div className="list-group list-group-flush">
                    {pending.incoming.slice(0, 3).map(conn => (
                      <div key={conn._id} className="list-group-item bg-transparent p-4 d-flex align-items-center gap-4 border-bottom">
                        <img 
                          src={conn.requester?.avatar || "/default-avatar.png"} 
                          alt="" 
                          width="56" 
                          height="56" 
                          className="rounded-full border object-cover" 
                        />
                        <div className="flex-grow-1">
                          <h6 className="mb-1 fw-bold fs-6">{conn.requester?.name}</h6>
                          <p className="text-muted small mb-0 line-clamp-1 italic">"{conn.message || "Wants to share skills with you!"}"</p>
                        </div>
                        <div className="d-flex gap-2">
                          <button 
                            onClick={() => handleRespond(conn._id, 'accepted')} 
                            className="btn btn-primary rounded-pill px-3 py-1 small d-flex align-items-center gap-1"
                          >
                            <LuCheck /> Accept
                          </button>
                          <button 
                            onClick={() => handleRespond(conn._id, 'rejected')} 
                            className="btn btn-outline-light text-dark rounded-pill px-3 py-1 small d-flex align-items-center gap-1 border"
                          >
                            <LuX /> Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Top Matches */}
          <div className="mb-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 className="h4 fw-bold mb-0">Discover Top Matches</h3>
              <Link to="/matches" className="text-primary fw-semibold small text-decoration-none">Explore All</Link>
            </div>
            <div className="row g-4">
              {matches.length > 0 ? (
                matches.map((m, idx) => (
                  <motion.div 
                    key={m.user?._id || m.user?.id} 
                    className="col-md-6"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <MatchCard match={m} compact />
                  </motion.div>
                ))
              ) : (
                <div className="col-12">
                   <div className="glass-card p-5 text-center border-dashed">
                      <p className="text-muted mb-0">No matches found yet. Try adding more skills to your profile!</p>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="col-lg-4">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card border-0 p-4 sticky-top"
            style={{ top: '100px' }}
          >
            <div className="bg-primary-light text-primary rounded-circle d-flex align-items-center justify-content-center mb-4" style={{ width: '48px', height: '48px' }}>
              <LuInfo size={24} />
            </div>
            <h5 className="fw-bold mb-3">Quick Wisdom</h5>
            <p className="text-secondary small leading-relaxed mb-4">
              Did you know? Users with complete bios are <strong>3.5x</strong> more likely to find a perfect skill-swap match within their first week.
            </p>
            <Link to="/profile/edit" className="btn btn-premium btn-premium-primary w-100 justify-content-center">
              Refine Your Profile
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}