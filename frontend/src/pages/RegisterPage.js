import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { LuUser, LuMail, LuLock, LuArrowRight, LuCircleCheck, LuEye, LuEyeOff } from 'react-icons/lu';

const InputField = ({ label, icon: Icon, type, value, onChange, placeholder }) => {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="mb-4 text-start">
      <label className="form-label fw-bold small text-muted text-uppercase tracking-wider">{label}</label>
      <div className="position-relative">
        <Icon className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={18} />
        <input
          type={isPassword ? (show ? 'text' : 'password') : type}
          className="form-control form-control-lg border-0 bg-light rounded-xl ps-5 fs-6"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required
        />
        {isPassword && (
          <button 
            type="button"
            onClick={() => setShow(!show)}
            className="btn border-0 position-absolute top-50 end-0 translate-middle-y me-2 text-muted p-2 shadow-none"
          >
            {show ? <LuEyeOff size={18} /> : <LuEye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
};

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success('Account created! Welcome 🎉');
      navigate('/profile/edit');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center py-5 bg-light-subtle">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="col-md-8 col-lg-6 col-xl-5 px-3"
      >
        <div className="glass-card border-0 p-4 p-md-5 bg-white shadow-2xl rounded-3xl">
          <div className="text-center mb-5">
            <Link to="/" className="d-inline-flex align-items-center gap-2 text-decoration-none mb-4">
              <div className="d-flex align-items-center justify-content-center">
                <img src="/logo.png" alt="SkillSwap" height="48" className="object-contain" />
              </div>
            </Link>
            <h2 className="fw-bold text-dark mb-1">Create Account</h2>
            <p className="text-secondary fw-medium">Join 50k+ members sharing knowledge daily.</p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="row g-1">
                <div className="col-12">
                   <InputField 
                    label="Full Name" 
                    icon={LuUser} 
                    type="text" 
                    placeholder="John Doe" 
                    value={form.name} 
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                />
                </div>
                <div className="col-12">
                   <InputField 
                    label="Email Address" 
                    icon={LuMail} 
                    type="email" 
                    placeholder="name@example.com" 
                    value={form.email} 
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                />
                </div>
                <div className="col-md-6">
                    <InputField 
                        label="Password" 
                        icon={LuLock} 
                        type="password" 
                        placeholder="Min. 6 characters" 
                        value={form.password} 
                        onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    />
                </div>
                <div className="col-md-6">
                    <InputField 
                        label="Confirm" 
                        icon={LuCircleCheck} 
                        type="password" 
                        placeholder="Repeat it" 
                        value={form.confirm} 
                        onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                    />
                </div>
            </div>
            
            <button 
                type="submit" 
                disabled={loading} 
                className="btn btn-premium btn-premium-primary w-100 py-3 fw-bold fs-6 shadow-lg d-flex align-items-center justify-content-center gap-2 mt-4"
            >
              {loading ? (
                  <span className="spinner-border spinner-border-sm" role="status"></span>
              ) : (
                  <>Create My Account <LuArrowRight /></>
              )}
            </button>
          </form>
          
          <div className="mt-5 text-center">
            <p className="mb-0 text-secondary fw-medium">
              Already part of the network? <Link to="/login" className="text-primary fw-bold text-decoration-none hover:underline">Sign In Instead</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}