import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LuZap, LuUsers, LuMessageSquare, LuGlobe, LuArrowRight, LuCircleCheck } from 'react-icons/lu';

export default function LandingPage() {
  const features = [
    { icon: LuZap, title: 'Smart Matching', desc: 'Our advanced algorithm pairs you with users whose skills perfectly complement yours.' },
    { icon: LuUsers, title: 'Mutual Exchange', desc: 'Teach what you know, learn what you love — no money needed, just pure skill.' },
    { icon: LuMessageSquare, title: 'Real-time Chat', desc: 'Coordinate sessions and share resources through our integrated messaging.' },
    { icon: LuGlobe, title: 'Global Network', desc: 'Connect with a diverse community of lifelong learners and mentors worldwide.' },
  ];

  const skills = ['UI Design', 'Go Lang', 'Video Editing', 'Spanish', 'Astro', 'Classical Guitar', 'LLM Prompting', 'Baking', 'Digital Marketing', 'Data Science'];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="landing-page bg-white min-vh-100">
      {/* Premium Navigation */}
      <nav className="navbar navbar-expand-lg sticky-top bg-white border-bottom py-3 py-lg-4">
        <div className="container">
          <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
            <div className="d-flex align-items-center justify-content-center">
              <img src="/logo.png" alt="SkillSwap" height="32" className="object-contain" />
            </div>
            <span className="fw-bold fs-4 tracking-tighter text-dark">SkillSwap</span>
          </Link>
          
          <button className="navbar-toggler border-0 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#landingNavbar">
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="landingNavbar">
            <div className="navbar-nav ms-auto flex-column flex-lg-row align-items-center gap-3 mt-3 mt-lg-0">
              <Link to="/login" className="btn btn-premium border bg-white text-secondary px-4 w-100 w-lg-auto">Sign In</Link>
              <Link to="/register" className="btn btn-premium btn-premium-primary text-white px-4 w-100 w-lg-auto">Get Started</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="py-5 overflow-hidden position-relative">
        <div className="container py-5 text-center position-relative z-1">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="badge bg-primary-light text-primary border border-primary-light rounded-pill px-4 py-2 mb-4 fw-bold"
          >
            <LuCircleCheck className="me-2" /> 100% Free Peer-to-Peer Learning
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="display-3 fw-bold mb-4 text-dark tracking-tight px-2"
          >
            Master Any Skill. <br className="d-none d-md-block"/><span className="text-primary">Without Spending a Dime.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="fs-5 text-secondary mb-5 mx-auto leading-relaxed" 
            style={{ maxWidth: '750px' }}
          >
            The world's most sophisticated community platform where knowledge is the currency. Teach what you know, learn what you love.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="d-flex flex-wrap justify-content-center gap-3 mb-5"
          >
            <Link to="/register" className="btn btn-premium btn-premium-primary btn-lg px-5 py-3 shadow-lg fs-5">
              Start Swapping Now <LuArrowRight className="ms-2" />
            </Link>
            <Link to="/login" className="btn btn-premium border bg-white text-dark btn-lg px-5 py-3 fs-5">
              Explore Platform
            </Link>
          </motion.div>
          
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="d-flex flex-wrap justify-content-center gap-2 mt-4"
          >
            {skills.map((s, i) => (
              <motion.span 
                variants={item}
                key={s} 
                className={`skill-tag px-4 py-2 shadow-sm ${i % 2 === 0 ? 'skill-tag-teach' : 'skill-tag-learn'}`}
              >
                {s}
              </motion.span>
            ))}
          </motion.div>
        </div>
        
        {/* Background Decorative Elements */}
        <div className="position-absolute top-50 start-50 translate-middle opacity-5 z-n1 d-none d-lg-block">
            <LuUsers size={600} />
        </div>
        <div className="position-absolute top-50 start-50 translate-middle opacity-5 z-n1 d-lg-none">
            <LuUsers size={300} />
        </div>
      </header>

      {/* Features Section */}
      <section className="bg-light py-5">
        <div className="container py-5">
          <div className="text-center mb-5">
            <h2 className="display-5 fw-bold text-dark mb-3">Designed for the Next Gen of Learners</h2>
            <p className="fs-5 text-secondary">A purpose-built ecosystem for knowledge sharing.</p>
          </div>
          <div className="row g-4 pt-4">
            {features.map((f, i) => (
              <motion.div 
                key={i} 
                className="col-md-6 col-lg-3"
                whileHover={{ y: -10 }}
              >
                <div className="glass-card h-100 border-0 shadow-sm p-4 text-center bg-white">
                  <div className="bg-primary-light text-primary mx-auto rounded-circle d-flex align-items-center justify-content-center mb-4" style={{ width: '64px', height: '64px' }}>
                    <f.icon size={32} />
                  </div>
                  <h4 className="fw-bold mb-3">{f.title}</h4>
                  <p className="text-secondary small leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-5">
        <div className="container py-5">
            <div className="glass-card border-0 bg-primary p-5 text-center text-white position-relative overflow-hidden shadow-2xl">
                <div className="position-relative z-1 py-4">
                    <h2 className="display-4 fw-bold mb-4">Ready to accelerate your growth?</h2>
                    <p className="fs-5 opacity-90 mb-5 mx-auto" style={{ maxWidth: '600px' }}>Join over 50,000+ members already transforming their careers through mutual skill sharing.</p>
                    <Link to="/register" className="btn btn-light btn-lg px-5 py-3 fw-bold text-primary rounded-pill shadow-lg translate-y-px">
                        Create Your Free Profile Today
                    </Link>
                </div>
                {/* Decorative blob */}
                <div className="position-absolute bottom-0 end-0 p-5 mt-n5 me-n5 opacity-10">
                    <LuGlobe size={400} />
                </div>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container py-5">
        <div className="row align-items-center border-top pt-5 g-4">
          <div className="col-md-6 text-center text-md-start">
            <div className="d-flex align-items-center gap-3 mb-3 justify-content-center justify-content-md-start">
              <div className="d-flex align-items-center justify-content-center">
                <img src="/logo.png" alt="SkillSwap" height="28" className="object-contain" />
              </div>
              <span className="fw-bold fs-4 text-dark">SkillSwap</span>
            </div>
            <p className="text-secondary small">&copy; 2024 SkillSwap. Building the future of peer-to-peer education.</p>
          </div>
          <div className="col-md-6 text-center text-md-end">
            <div className="d-flex gap-4 justify-content-center justify-content-md-end text-secondary small">
                <Link to="#" className="text-decoration-none text-secondary hover:text-primary">Platform</Link>
                <Link to="#" className="text-decoration-none text-secondary hover:text-primary">Community</Link>
                <Link to="#" className="text-decoration-none text-secondary hover:text-primary">Terms</Link>
                <Link to="#" className="text-decoration-none text-secondary hover:text-primary">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}