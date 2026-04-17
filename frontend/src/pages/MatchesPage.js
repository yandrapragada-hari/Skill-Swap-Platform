import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import MatchCard from '../components/MatchCard';
import { motion } from 'framer-motion';
import { LuUsers, LuSearch, LuFilter, LuTarget, LuArrowRight, LuStar, LuMapPin, LuBookOpen, LuZap } from 'react-icons/lu';

export default function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'mutual' | 'highest'

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/matches');
        setMatches(res.data.matches || []);
      } catch (err) {
        console.error("Matches load error:", err);
      } finally {
        setTimeout(() => setLoading(false), 400);
      }
    };
    load();
  }, []);

  const renderSkill = (skill) => {
    if (!skill) return '';
    if (typeof skill === 'string') return skill;
    return skill.name || '';
  };

  // Filter and search logic
  const filteredMatches = matches.filter(m => {
    // Search by name or skills
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const nameMatch = m.user.name?.toLowerCase().includes(term);
      const teachMatch = m.teachesYou?.some(s => renderSkill(s).toLowerCase().includes(term));
      const learnMatch = m.learnsFromYou?.some(s => renderSkill(s).toLowerCase().includes(term));
      const userSkillMatch = m.user.teachSkills?.some(s => renderSkill(s).toLowerCase().includes(term));
      if (!nameMatch && !teachMatch && !learnMatch && !userSkillMatch) return false;
    }
    // Filter by type
    if (filter === 'mutual') return m.isReciprocal;
    return true;
  }).sort((a, b) => {
    if (filter === 'highest') return b.score - a.score;
    return 0;
  });

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: '60vh' }}>
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 0.6, repeat: Infinity }}
          className="text-primary mb-3"
        >
          <LuZap size={40} />
        </motion.div>
        <p className="text-muted fw-medium">Finding compatible partners...</p>
      </div>
    );
  }

  return (
    <div className="pb-5">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3">
        <div>
          <h1 className="fw-bold mb-1">Discover Matches</h1>
          <p className="text-secondary mb-0">
            {filteredMatches.length} {filteredMatches.length === 1 ? 'member' : 'members'} found with complementary skills
          </p>
        </div>
        <div className="d-flex gap-2">
            <select 
              className="form-select rounded-pill border-0 shadow-sm glass-card fw-medium text-secondary"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ minWidth: '160px' }}
            >
              <option value="all">All Matches</option>
              <option value="mutual">Mutual Only</option>
              <option value="highest">Best Match First</option>
            </select>
            <div className="position-relative">
                <LuSearch className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                <input 
                    type="text" 
                    placeholder="Search by name or skill..." 
                    className="form-control rounded-pill ps-5 border-0 shadow-sm glass-card"
                    style={{ minWidth: '260px' }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
      </div>

      {filteredMatches.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-5 text-center border-dashed bg-white"
        >
          <div className="mx-auto bg-light rounded-circle d-flex align-items-center justify-content-center mb-4" style={{ width: '80px', height: '80px' }}>
            <LuSearch size={40} className="text-muted" />
          </div>
          <h3 className="fw-bold mb-2">{searchTerm ? 'No results found' : 'No matches yet'}</h3>
          <p className="text-muted mb-4 mx-auto" style={{ maxWidth: '400px' }}>
            {searchTerm 
              ? `No matches found for "${searchTerm}". Try a different search term.`
              : 'It looks like we couldn\'t find matches based on your current skills. Try broadening your teaching or learning interests!'}
          </p>
          {searchTerm ? (
            <button onClick={() => setSearchTerm('')} className="btn btn-premium btn-premium-primary">
              Clear Search
            </button>
          ) : (
            <Link to="/profile/edit" className="btn btn-premium btn-premium-primary">
              Update Your Skills
            </Link>
          )}
        </motion.div>
      ) : (
        <div className="row g-4">
          {filteredMatches.map((m, idx) => (
            <motion.div 
              key={m.user.id || m.user._id} 
              className="col-md-6 col-lg-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <MatchCard match={m} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
