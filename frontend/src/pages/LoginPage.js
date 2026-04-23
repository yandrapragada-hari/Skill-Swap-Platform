import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { LuMail, LuLock, LuArrowRight, LuEye, LuEyeOff } from 'react-icons/lu';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center py-5 bg-light-subtle">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="col-md-6 col-lg-5 col-xl-4 px-3"
      >
        <div className="glass-card border-0 p-4 p-md-5 bg-white shadow-2xl rounded-3xl">
          <div className="text-center mb-5">
            <Link to="/" className="d-inline-flex align-items-center gap-2 text-decoration-none mb-4">
              <div className="d-flex align-items-center justify-content-center">
                <img src="/logo.png" alt="SkillSwap" height="48" className="object-contain" />
              </div>
            </Link>
            <h2 className="fw-bold text-dark mb-1">Welcome Back</h2>
            <p className="text-secondary fw-medium">Continue your skill exchange journey.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="text-start">
            <div className="mb-4">
              <label className="form-label fw-bold small text-muted text-uppercase tracking-wider">Email Address</label>
              <div className="position-relative">
                <LuMail className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={18} />
                <input
                  type="email"
                  className="form-control form-control-lg border-0 bg-light rounded-xl ps-5 fs-6"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="mb-5">
              <div className="d-flex justify-content-between">
                <label className="form-label fw-bold small text-muted text-uppercase tracking-wider">Password</label>
                <Link to="#" className="small text-primary fw-bold text-decoration-none transition-all hover:translate-x-1">Forgot?</Link>
              </div>
              <div className="position-relative">
                <LuLock className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-control form-control-lg border-0 bg-light rounded-xl ps-5 pe-5 fs-6"
                  placeholder="Enter secure password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="btn border-0 position-absolute top-50 end-0 translate-middle-y me-2 text-muted p-2 shadow-none"
                >
                  {showPassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                </button>
              </div>
            </div>
            
            <button 
                type="submit" 
                disabled={loading} 
                className="btn btn-premium btn-premium-primary w-100 py-3 fw-bold fs-6 shadow-lg d-flex align-items-center justify-content-center gap-2"
            >
              {loading ? (
                  <span className="spinner-border spinner-border-sm" role="status"></span>
              ) : (
                  <>Sign In <LuArrowRight /></>
              )}
            </button>
          </form>
          
          <div className="mt-5 text-center">
            <p className="mb-0 text-secondary fw-medium">
              New to the community? <Link to="/register" className="text-primary fw-bold text-decoration-none hover:underline">Create Account</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}