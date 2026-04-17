import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { LuUsers, LuArrowDownLeft, LuArrowUpRight, LuMessageSquare, LuTrash2, LuCheck, LuX, LuClock, LuZap, LuStar, LuCircleCheck } from 'react-icons/lu';

const tabs = [
    { label: 'Network', icon: LuUsers },
    { label: 'Incoming', icon: LuArrowDownLeft },
    { label: 'Sent', icon: LuArrowUpRight }
];

export default function ConnectionsPage() {
  const { user: me } = useAuth();
  const [tab, setTab] = useState(0);
  const [connections, setConnections] = useState([]);
  const [pending, setPending] = useState({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        api.get('/connections?status=accepted'),
        api.get('/connections/pending')
      ]);
      setConnections(cRes.data.connections || []);
      setPending(pRes.data);
    } catch (err) {
      console.error("Load failed:", err);
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };

  useEffect(() => { load(); }, []);

  const respond = async (id, status) => {
    try {
      await api.put(`/connections/${id}/respond`, { status });
      toast.success(status === 'accepted' ? 'Connection accepted!' : 'Request declined');
      load();
    } catch { toast.error('Action failed'); }
  };

  const remove = async (id) => {
    if (!window.confirm('Remove this connection?')) return;
    try { 
      await api.delete(`/connections/${id}`); 
      toast.success('Connection removed'); 
      load(); 
    } catch { toast.error('Failed to remove'); }
  };

  const completeSwap = async (connId) => {
    try {
      setSubmitting(true);
      const res = await api.put(`/connections/${connId}/complete`);
      toast.success(res.data.message);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete swap');
    } finally {
      setSubmitting(false);
    }
  };

  const submitReview = async () => {
    if (!reviewRating) { toast.error('Please select a rating'); return; }
    try {
      setSubmitting(true);
      await api.post(`/connections/${reviewModal._id || reviewModal.id}/review`, {
        rating: reviewRating,
        comment: reviewComment,
      });
      toast.success('Review submitted! Thank you for your feedback.');
      setReviewModal(null);
      setReviewRating(0);
      setReviewComment('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: '60vh' }}>
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="text-primary mb-3"
        >
          <LuZap size={40} />
        </motion.div>
        <p className="text-muted fw-medium">Loading your network...</p>
      </div>
    );
  }

  const myId = me?.id || me?._id;

  const renderUserItem = (conn, showActions = false, isIncoming = false) => {
    const user = conn.user || conn.requester || conn.recipient;
    const connId = conn._id || conn.id;
    const swapCompletedBy = conn.swapCompletedBy || [];
    const iMarkedComplete = swapCompletedBy.includes(myId);
    const isFullyCompleted = conn.status === 'completed';
    const myReview = (conn.reviews || []).find(r => 
      r.reviewer?.toString() === myId || r.reviewer === myId
    );

    return (
      <motion.div 
        key={connId}
        layout
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-card mb-3 border-0 bg-white"
      >
        <div className="card-body p-4">
          <div className="d-flex align-items-center gap-4 flex-wrap">
            <Link to={`/users/${user?.id || user?._id}`}>
              <img 
                src={user?.avatar || "/default-avatar.png"} 
                alt={user?.name} 
                className="rounded-circle object-cover border-2 border-white shadow-sm" 
                width="64" 
                height="64" 
              />
            </Link>
            <div className="flex-grow-1 overflow-hidden">
              <Link to={`/users/${user?.id || user?._id}`} className="fw-bold text-dark text-decoration-none fs-5">
                {user?.name}
              </Link>
              <div className="text-muted small mt-1">
                {conn.sharedTeachSkills?.length > 0 ? (
                  <span>Shares: <strong className="text-primary">{conn.sharedTeachSkills.join(', ')}</strong></span>
                ) : (
                  <span>No shared skills listed</span>
                )}
              </div>
              {!showActions && (
                <div className="mt-2 d-flex flex-wrap gap-2">
                  {isFullyCompleted ? (
                    <span className="bg-success-light text-success px-2 py-1 rounded small fw-bold d-flex align-items-center gap-1 border border-success-subtle">
                      <LuCircleCheck size={14} /> Swap Completed
                    </span>
                  ) : iMarkedComplete ? (
                    <span className="bg-warning-light text-warning-emphasis px-2 py-1 rounded small fw-bold d-flex align-items-center gap-1 border border-warning-subtle">
                      <LuClock size={14} /> Waiting for partner to confirm
                    </span>
                  ) : null}
                </div>
              )}
            </div>
            <div className="d-flex gap-2 flex-wrap">
              {showActions && isIncoming ? (
                <>
                  <button onClick={() => respond(connId, 'accepted')} className="btn btn-premium btn-premium-primary text-white py-2 px-3">
                    <LuCheck className="me-1" /> Accept
                  </button>
                  <button onClick={() => respond(connId, 'rejected')} className="btn btn-premium border bg-white text-danger py-2 px-3">
                    <LuX className="me-1" /> Decline
                  </button>
                </>
              ) : !showActions ? (
                <>
                  <Link to={`/messages/${[myId, user?.id || user?._id].sort().join('_')}`} className="btn btn-premium border bg-white text-primary px-3 shadow-none">
                    <LuMessageSquare className="me-1" /> Chat
                  </Link>
                  {!isFullyCompleted && !iMarkedComplete && (
                    <button 
                      onClick={() => completeSwap(connId)} 
                      disabled={submitting}
                      className="btn btn-premium border bg-white text-success px-3 shadow-none"
                      title="Mark this swap as complete"
                    >
                      <LuCircleCheck className="me-1" /> Complete
                    </button>
                  )}
                  {(isFullyCompleted || iMarkedComplete) && !myReview && (
                    <button 
                      onClick={() => setReviewModal(conn)}
                      className="btn btn-premium border bg-white text-warning px-3 shadow-none"
                    >
                      <LuStar className="me-1" /> Review
                    </button>
                  )}
                  <button onClick={() => remove(connId)} className="btn btn-premium border bg-white text-danger px-3 shadow-none">
                    <LuTrash2 />
                  </button>
                </>
              ) : (
                <div className="bg-warning-light text-warning px-3 py-1 rounded-pill small fw-bold border border-warning-subtle d-flex align-items-center gap-1">
                  <LuClock size={14} /> Pending
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const lists = [connections, pending.incoming || [], pending.outgoing || []];
  const listCounts = [connections.length, pending.incoming?.length || 0, pending.outgoing?.length || 0];

  return (
    <div className="pb-5">
      <div className="mb-5">
        <h1 className="fw-bold mb-1">My Network</h1>
        <p className="text-secondary mb-0">Manage your skill exchange connections and pending requests.</p>
      </div>

      <div className="glass-card border-0 p-2 mb-5 d-inline-flex gap-2 bg-white shadow-sm rounded-pill">
        {tabs.map((t, i) => (
          <button 
            key={t.label}
            onClick={() => setTab(i)} 
            className={`btn rounded-pill px-4 py-2 d-flex align-items-center gap-2 fw-semibold transition-all ${tab === i ? 'btn-primary text-white shadow' : 'btn-link text-muted text-decoration-none'}`}
          >
            <t.icon size={18} />
            {t.label} 
            {listCounts[i] > 0 && <span className={`ms-2 px-2 rounded-pill small ${tab === i ? 'bg-white text-primary' : 'bg-light text-muted'}`}>{listCounts[i]}</span>}
          </button>
        ))}
      </div>

      <div className="row justify-content-center">
        <div className="col-12">
          <AnimatePresence mode="wait">
            {lists[tab].length === 0 ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card p-5 text-center border-dashed bg-white"
              >
                <div className="mx-auto bg-light rounded-circle d-flex align-items-center justify-content-center mb-4" style={{ width: '80px', height: '80px' }}>
                  <LuUsers size={40} className="text-muted" />
                </div>
                <h3 className="fw-bold mb-2">{tab === 0 ? 'No connections yet' : 'Empty Inbox'}</h3>
                <p className="text-muted mb-4 mx-auto" style={{ maxWidth: '400px' }}>
                  {tab === 0 ? 'Your professional network is just a request away. Discover experts sharing their skills today.' : 'You have no pending requests in this section.'}
                </p>
                {tab === 0 && (
                  <Link to="/matches" className="btn btn-premium btn-premium-primary">
                    Discover Matches
                  </Link>
                )}
              </motion.div>
            ) : (
                <motion.div 
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {lists[tab].map(conn => renderUserItem(conn, tab !== 0, tab === 1))}
                </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setReviewModal(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="modal-content border-0 shadow-2xl rounded-3xl overflow-hidden"
            >
              <div className="modal-header border-0 bg-white p-4">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <LuStar className="text-warning" /> Rate Your Swap Partner
                </h5>
                <button type="button" className="btn-close" onClick={() => setReviewModal(null)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="text-center mb-4">
                  <img 
                    src={reviewModal.user?.avatar || "/default-avatar.png"} 
                    alt="" 
                    width="80" 
                    height="80" 
                    className="rounded-circle shadow-sm border mb-3"
                  />
                  <h5 className="fw-bold mb-1">{reviewModal.user?.name}</h5>
                  <p className="text-muted small mb-0">How was your skill exchange experience?</p>
                </div>

                {/* Star Rating */}
                <div className="d-flex justify-content-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="btn p-0 border-0 bg-transparent"
                      style={{ fontSize: '2rem', transition: 'transform 0.15s' }}
                      onMouseEnter={e => e.target.style.transform = 'scale(1.2)'}
                      onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                    >
                      <LuStar 
                        size={36} 
                        className={star <= reviewRating ? 'text-warning' : 'text-muted opacity-25'}
                        fill={star <= reviewRating ? '#f59e0b' : 'none'}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-center fw-semibold mb-4">
                  {reviewRating === 0 && 'Select a rating'}
                  {reviewRating === 1 && '⭐ Poor'}
                  {reviewRating === 2 && '⭐⭐ Fair'}
                  {reviewRating === 3 && '⭐⭐⭐ Good'}
                  {reviewRating === 4 && '⭐⭐⭐⭐ Very Good'}
                  {reviewRating === 5 && '⭐⭐⭐⭐⭐ Excellent!'}
                </p>

                {/* Comment */}
                <textarea
                  className="form-control border-0 bg-light rounded-xl px-4 py-3"
                  rows={3}
                  placeholder="Share your experience (optional)..."
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                />
              </div>
              <div className="modal-footer border-0 p-4">
                <button className="btn btn-premium border bg-white px-4 py-2" onClick={() => setReviewModal(null)}>
                  Cancel
                </button>
                <button 
                  className="btn btn-premium btn-premium-primary px-4 py-2 shadow"
                  onClick={submitReview}
                  disabled={submitting || !reviewRating}
                >
                  {submitting ? <span className="spinner-border spinner-border-sm me-2"></span> : <LuStar className="me-2" />}
                  Submit Review
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}