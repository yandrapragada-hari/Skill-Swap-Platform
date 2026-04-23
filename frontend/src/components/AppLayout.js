import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LuLayoutDashboard, LuUsers, LuMessageSquare, LuUser, LuLogOut, LuGlobe } from 'react-icons/lu';
import { motion } from 'framer-motion';
import { getSocket } from '../services/socket';
import VideoCallOverlay from './VideoCallOverlay';
import toast from 'react-hot-toast';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = React.useState(null);
  const [activeCallConv, setActiveCallConv] = React.useState(null);

  React.useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleIncomingCall = (call) => {
      setIncomingCall(call);
    };

    const handleCallEnded = () => {
      setIncomingCall(null);
    };

    socket.on('incoming-call', handleIncomingCall);
    socket.on('call-ended', handleCallEnded);

    // Global listener for initiating calls from messages page or elsewhere
    const handleTriggerCall = (e) => {
      setActiveCallConv(e.detail);
    };
    window.addEventListener('trigger-call', handleTriggerCall);

    return () => {
      socket.off('incoming-call', handleIncomingCall);
      socket.off('call-ended', handleCallEnded);
      window.removeEventListener('trigger-call', handleTriggerCall);
    };
  }, []);

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
            <div className="d-flex flex-column flex-lg-row w-100 justify-content-between align-items-stretch align-items-lg-center mt-3 mt-lg-0 bg-white bg-lg-transparent p-3 p-lg-0 rounded-4 shadow-sm shadow-lg-none border border-light border-lg-0">
              <ul className="navbar-nav mx-auto mb-3 mb-lg-0 gap-2 w-100 w-lg-auto">
                {navItems.map((item) => (
                  <li className="nav-item w-100 w-lg-auto" key={item.to}>
                    <NavLink 
                      className={({ isActive }) => 
                        `nav-link d-flex align-items-center gap-2 px-3 py-2 rounded-3 transition-all w-100 ${
                          isActive 
                          ? 'bg-primary-light text-primary fw-semibold' 
                          : 'text-secondary hover-bg-light hover-text-primary'
                        }`
                      } 
                      to={item.to}
                    >
                      <item.icon size={20} />
                      <span className="fs-6">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
              
              <div className="d-flex flex-column flex-lg-row align-items-center gap-3 mt-2 mt-lg-0 w-100 w-lg-auto pt-3 pt-lg-0 border-top border-lg-0 border-light">
                <NavLink to="/profile" className="nav-link p-0 text-decoration-none w-100 w-lg-auto">
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="d-flex align-items-center gap-2 gap-sm-3 bg-light p-1 pe-2 pe-sm-3 rounded-pill border w-100"
                  >
                    <img 
                      src={user?.avatar || "/default-avatar.png"} 
                      alt={user?.name} 
                      width="36" 
                      height="36" 
                      className="rounded-circle shadow-sm" 
                    />
                    <span className="fw-semibold text-dark text-truncate" style={{maxWidth: '120px'}}>{user?.name?.split(' ')[0]}</span>
                    <span className="ms-auto d-lg-none text-muted small">View Profile</span>
                  </motion.div>
                </NavLink>

                <button 
                  onClick={handleLogout} 
                  className="btn btn-light rounded-pill px-4 py-2 w-100 d-flex align-items-center justify-content-center border text-danger flex-shrink-0 d-lg-none shadow-sm"
                  title="Sign Out"
                >
                  <LuLogOut size={20} className="me-2" />
                  <span className="fw-semibold text-uppercase tracking-wider small">Sign Out</span>
                </button>

                <button 
                  onClick={handleLogout} 
                  className="btn btn-light rounded-circle p-2 d-none d-lg-flex align-items-center justify-content-center border text-danger flex-shrink-0"
                  style={{width: '40px', height: '40px'}}
                  title="Sign Out"
                >
                  <LuLogOut size={20} />
                </button>
              </div>
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

      <VideoCallOverlay 
        user={user}
        activeConv={activeCallConv}
        incomingCall={incomingCall}
        onEndCall={() => {
          setIncomingCall(null);
          setActiveCallConv(null);
        }}
      />
    </div>
  );
}