import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LuLayoutDashboard, LuUsers, LuMessageSquare, LuUser, LuLogOut, LuGlobe } from 'react-icons/lu';
import { motion } from 'framer-motion';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LuLayoutDashboard },
    { to: "/matches", label: "Matches", icon: LuGlobe },
    { to: "/connections", label: "Connections", icon: LuUsers },
    { to: "/messages", label: "Messages", icon: LuMessageSquare },
  ];

  return (
    <div className="app-container min-vh-100 pb-5">
      {/* Premium Navbar */}
      <nav className="navbar navbar-expand-lg sticky-top glass-card rounded-0 border-top-0 border-start-0 border-end-0 py-3 mb-4">
        <div className="container">
          <NavLink className="navbar-brand d-flex align-items-center gap-2" to="/dashboard">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="d-flex align-items-center justify-content-center"
            >
              <img src="/logo.png" alt="SkillSwap" height="32" className="object-contain" />
            </motion.div>
            <span className="fw-bold tracking-tight text-primary fs-4">SkillSwap</span>
          </NavLink>

          <button className="navbar-toggler border-0 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#navbarMain">
            <span className="navbar-toggler-icon"></span>
          </button>
          
          <div className="collapse navbar-collapse" id="navbarMain">
            <ul className="navbar-nav mx-auto mb-2 mb-lg-0 gap-2">
              {navItems.map((item) => (
                <li className="nav-item" key={item.to}>
                  <NavLink 
                    className={({ isActive }) => 
                      `nav-link d-flex align-items-center gap-2 px-3 py-2 rounded-pill transition-all ${
                        isActive 
                        ? 'bg-primary-light text-primary fw-semibold' 
                        : 'text-secondary hover:bg-light'
                      }`
                    } 
                    to={item.to}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
            
            <div className="navbar-nav align-items-center gap-3">
              <NavLink to="/profile" className="nav-link p-0">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="d-flex align-items-center gap-2 bg-light p-1 pe-3 rounded-pill border"
                >
                  <img 
                    src={user?.avatar || "/default-avatar.png"} 
                    alt={user?.name} 
                    width="32" 
                    height="32" 
                    className="rounded-circle" 
                  />
                  <span className="small fw-semibold text-dark d-none d-sm-inline">{user?.name?.split(' ')[0]}</span>
                </motion.div>
              </NavLink>

              <button 
                onClick={handleLogout} 
                className="btn btn-light rounded-circle p-2 d-flex align-items-center justify-content-center border text-danger"
                title="Sign Out"
              >
                <LuLogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content with Frame Animation */}
      <motion.main 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="container"
      >
        <Outlet />
      </motion.main>
    </div>
  );
}