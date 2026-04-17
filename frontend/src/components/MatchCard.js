import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { LuUser, LuAward, LuSend, LuEye, LuRepeat, LuBookOpen, LuArrowUpRight, LuTarget, LuCircleCheck, LuUsers, LuStar } from 'react-icons/lu';

export default function MatchCard({ match, compact = false }) {
  const { user, score, teachesYou, learnsFromYou, isReciprocal } = match;
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  
  const renderSkill = (skill) => {
    if (!skill) return null;
    if (typeof skill === 'string') return skill;
    return skill.name || skill;
  };

  const handleConnect = async () => {
    setSending(true);
    try {
      await api.post(`/connections/request/${user.id || user._id}`);
      toast.success(`Request sent to ${user.name}!`);
      setSent(true);
    } catch (err) {
      toast.error(err.message || 'Failed to send request');
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={`glass-card h-100 overflow-hidden border-0 ${compact ? 'shadow-sm' : 'shadow'}`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="d-flex align-items-start justify-content-between mb-3">
          <Link to={`/users/${user.id || user._id}`} className="d-flex align-items-center text-decoration-none">
            <div className="position-relative me-3">
              <img 
                src={user.avatar || "/default-avatar.png"} 
                alt={user.name} 
                width="64" 
                height="64" 
                className="rounded-circle border-2 border-white shadow-sm object-cover" 
              />
              {isReciprocal && (
                <div className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle p-1 border border-white" style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
                  <LuRepeat size={12} />
                </div>
              )}
            </div>
            <div className="overflow-hidden">
              <h5 className="fw-bold text-dark mb-1 text-truncate">{user.name}</h5>
              <div className="d-flex align-items-center text-primary fw-semibold small">
                <LuBookOpen className="me-1" />
                <span className="text-truncate">
                  {(() => {
                    const displaySkills = teachesYou.length > 0 ? teachesYou : (user.teachSkills || []);
                    return displaySkills.length > 0 
                      ? displaySkills.map(renderSkill).slice(0, 2).join(', ') + (displaySkills.length > 2 ? '...' : '') 
                      : "Expert Mentor";
                  })()}
                </span>
              </div>
            </div>
          </Link>
          {/* Rating badge — top right */}
          <div className="d-flex flex-column align-items-end gap-1">
            <div className="bg-warning-light text-warning-emphasis px-2 py-1 rounded-pill d-flex align-items-center gap-1 fw-bold small border border-warning-subtle">
              <LuStar size={13} />
              <span>{user.rating?.toFixed(1) || '0.0'}</span>
            </div>
          </div>
        </div>

        {/* Stats badges: Connections (followers) + Completed Swaps */}
        <div className="mb-3 d-flex gap-2 flex-wrap">
          {/* Connections = accepted connections, like Instagram followers */}
          <div className="bg-info-light text-info-emphasis px-2 py-1 rounded small d-flex align-items-center gap-1 border border-info-subtle fw-semibold">
            <LuUsers size={13} />
            <span>{user.connectionCount ?? 0} Connection{(user.connectionCount ?? 0) !== 1 ? 's' : ''}</span>
          </div>
          {/* Completed Swaps = fully done skill exchanges */}
          <div className="bg-success-light text-success px-2 py-1 rounded small d-flex align-items-center gap-1 border border-success-subtle fw-semibold">
            <LuCircleCheck size={13} />
            <span>{user.completedSwaps || 0} Swap{(user.completedSwaps || 0) !== 1 ? 's' : ''}</span>
          </div>
          {isReciprocal && (
            <div className="bg-primary-light text-primary px-2 py-1 rounded small fw-semibold border border-primary-subtle">
              Mutual Match
            </div>
          )}
        </div>

        {/* Skills */}
        {!compact && (
          <div className="mb-4">
            {teachesYou.length > 0 && (
              <div className="mb-3">
                <p className="text-muted small fw-bold text-uppercase tracking-wider mb-2" style={{ fontSize: '0.65rem' }}>They Teach</p>
                <div className="d-flex flex-wrap gap-2">
                  {teachesYou.slice(0, 2).map(s => <span key={renderSkill(s)} className="skill-tag skill-tag-teach">{renderSkill(s)}</span>)}
                  {teachesYou.length > 2 && <span className="text-muted small align-self-center">+{teachesYou.length - 2}</span>}
                </div>
              </div>
            )}
            {learnsFromYou.length > 0 && (
              <div>
                <p className="text-muted small fw-bold text-uppercase tracking-wider mb-2" style={{ fontSize: '0.65rem' }}>They Want to Learn</p>
                <div className="d-flex flex-wrap gap-2">
                  {learnsFromYou.slice(0, 2).map(s => <span key={renderSkill(s)} className="skill-tag skill-tag-learn">{renderSkill(s)}</span>)}
                  {learnsFromYou.length > 2 && <span className="text-muted small align-self-center">+{learnsFromYou.length - 2}</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="d-flex gap-2 pt-2">
          <button
            onClick={handleConnect}
            disabled={sending || sent}
            className={`btn btn-premium flex-grow-1 ${sent ? 'btn-outline-success border-success text-success disabled bg-white' : 'btn-premium-primary text-white'}`}
          >
            {sent ? 'Requested' : sending ? <span className="spinner-border spinner-border-sm me-2"></span> : 'Connect'}
          </button>
          <Link 
            to={`/users/${user.id || user._id}`} 
            className="btn btn-premium border bg-white text-secondary hover:bg-light px-3"
            title="View Profile"
          >
            <LuEye />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}