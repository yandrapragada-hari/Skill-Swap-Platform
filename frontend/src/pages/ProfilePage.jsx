import React, { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import Cropper from 'react-easy-crop';
import { LuUser, LuMapPin, LuCalendar, LuStar, LuPencil, LuBookOpen, LuGraduationCap, LuCircleCheck, LuZap, LuCamera, LuTrash2 } from 'react-icons/lu';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarDeleting, setAvatarDeleting] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const fileInputRef = useRef(null);
  const maxAvatarSize = 2 * 1024 * 1024; // 2 MB

  const renderSkill = (skill) => {
    if (!skill) return null;
    if (typeof skill === 'string') return skill;
    return skill.name || skill;
  };

  if (!user) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: '60vh' }}>
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-primary mb-3"
        >
          <LuZap size={40} />
        </motion.div>
        <p className="text-muted fw-medium">Loading profile...</p>
      </div>
    );
  }

  const profileStats = [
    { label: 'Completed Swaps', value: user.completedSwaps || 0, color: 'text-primary' },
    { label: 'Teaching', value: user.teachSkills?.length || 0, color: 'text-rose' },
    { label: 'Learning', value: user.learnSkills?.length || 0, color: 'text-cyan' },
    { label: 'Rating', value: user.rating?.toFixed(1) || '0.0', color: 'text-warning' },
  ];

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', reject);
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImageBlob = async (imageSrc, pixelCrop) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to crop image'));
      }, 'image/jpeg', 0.9);
    });
  };

  const onAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > maxAvatarSize) {
      toast.error('Image too large. Upload a file under 2MB.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setSelectedAvatar({ file, previewUrl });
    setShowCropper(true);
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropCancel = () => {
    if (selectedAvatar?.previewUrl) URL.revokeObjectURL(selectedAvatar.previewUrl);
    setSelectedAvatar(null);
    setShowCropper(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const uploadCroppedAvatar = async () => {
    if (!selectedAvatar?.previewUrl || !croppedAreaPixels) return;
    try {
      setAvatarUploading(true);
      const blob = await getCroppedImageBlob(selectedAvatar.previewUrl, croppedAreaPixels);
      const formData = new FormData();
      formData.append('avatar', blob, 'avatar.jpg');
      const res = await api.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser(res.data.user);
      toast.success('Profile image updated successfully');
      handleCropCancel();
    } catch (err) {
      console.error('Avatar crop upload failed:', err);
      toast.error(err.response?.data?.message || 'Failed to upload cropped avatar');
      setAvatarUploading(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (!window.confirm('Delete your current profile image?')) return;

    try {
      setAvatarDeleting(true);
      const res = await api.delete('/profile/avatar');
      updateUser(res.data.user);
      toast.success('Profile image removed successfully');
    } catch (err) {
      console.error('Avatar delete failed:', err);
      toast.error(err.response?.data?.message || 'Failed to remove avatar');
    } finally {
      setAvatarDeleting(false);
    }
  };

  return (
    <div className="pb-5">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 mb-md-5 gap-3">
            <div>
                <h1 className="fw-bold mb-1">My Profile</h1>
                <p className="text-secondary mb-0 small small-md-base">Manage your public presence and expert identity.</p>
            </div>
            <Link to="/profile/edit" className="btn btn-premium btn-premium-primary text-white shadow w-20 w-sm-auto justify-content-center px-4 py-2">
              <LuPencil /> Edit Profile
            </Link>
          </div>

          {/* Profile Header Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card mb-5 border-0 bg-white shadow-lg overflow-hidden"
          >
            <div className="bg-primary-light h-32 w-100" style={{ height: '120px' }}></div>
            <div className="card-body p-3 p-md-4 pt-0">
              <div className="d-flex flex-column flex-md-row align-items-center align-items-md-end gap-3 gap-md-4 mb-4 mb-md-5" style={{ marginTop: '-60px' }}>
                <div className="position-relative">
                   <img 
                    src={user.avatar || "/default-avatar.png"} 
                    alt={user.name} 
                    className="rounded-circle border border-4 border-white shadow-xl object-cover bg-white" 
                    width="120" 
                    height="120" 
                   />
                   <button
                     type="button"
                     onClick={() => fileInputRef.current?.click()}
                     className="btn btn-light position-absolute bottom-0 end-0 rounded-circle border shadow-sm d-flex align-items-center justify-content-center"
                     style={{ width: '38px', height: '38px' }}
                   >
                     {avatarUploading ? (
                       <span className="spinner-border spinner-border-sm text-primary"></span>
                     ) : (
                       <LuCamera size={18} />
                     )}
                   </button>
                   {user.avatar?.includes('/uploads/') && (
                     <button
                       type="button"
                       onClick={handleAvatarDelete}
                       className="btn btn-light position-absolute bottom-0 start-0 rounded-circle border shadow-sm d-flex align-items-center justify-content-center"
                       style={{ width: '38px', height: '38px', zIndex: 2 }}
                     >
                       {avatarDeleting ? (
                         <span className="spinner-border spinner-border-sm text-danger"></span>
                       ) : (
                         <LuTrash2 size={18} className="text-danger" />
                       )}
                     </button>
                   )}
                   <input
                     type="file"
                     accept="image/*"
                     ref={fileInputRef}
                     style={{ display: 'none' }}
                     onChange={onAvatarFileChange}
                   />
                   <div className="position-absolute top-0 start-0 bg-success p-1 rounded-circle border border-3 border-white shadow-sm" style={{ width: '20px', height: '20px', transform: 'translate(-25%, -25%)' }}></div>
                </div>
                <div className="text-center text-md-start pb-1">
                  <h2 className="fw-bold mb-1 fs-2">{user.name}</h2>
                  <p className="text-secondary fs-6 mb-0">{user.email}</p>
                </div>
              </div>

              <div className="row g-4 mb-5">
                <div className="col-md-4">
                    <div className="d-flex align-items-center gap-3 p-3 rounded-xl bg-light border">
                        <div className="text-primary bg-primary-light p-2 rounded-lg"><LuBookOpen size={24} /></div>
                        <div>
                            <small className="text-muted d-block fw-bold text-uppercase tracking-wider" style={{ fontSize: '0.6rem' }}>Primary Skill</small>
                            <span className="fw-semibold">{user.teachSkills?.[0] || "Expert Member"}</span>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="d-flex align-items-center gap-3 p-3 rounded-xl bg-light border">
                        <div className="text-rose bg-rose-light p-2 rounded-lg"><LuCalendar size={24} /></div>
                        <div>
                            <small className="text-muted d-block fw-bold text-uppercase tracking-wider" style={{ fontSize: '0.6rem' }}>Joined</small>
                            <span className="fw-semibold">{new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="d-flex align-items-center gap-3 p-3 rounded-xl bg-light border">
                        <div className="text-warning bg-warning-light p-2 rounded-lg"><LuStar size={24} /></div>
                        <div>
                            <small className="text-muted d-block fw-bold text-uppercase tracking-wider" style={{ fontSize: '0.6rem' }}>Rating</small>
                            <span className="fw-semibold">{user.rating?.toFixed(1) || '0.0'} ({user.totalRatings || 0} Reviews)</span>
                        </div>
                    </div>
                </div>
              </div>

              {showCropper && selectedAvatar?.previewUrl && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 1100 }}>
                  <div className="bg-white rounded-4 shadow-lg" style={{ width: 'min(90vw, 680px)', maxHeight: '90vh', overflow: 'auto' }}>
                    <div className="d-flex align-items-center justify-content-between p-4 border-bottom flex-wrap gap-3">
                      <div>
                        <h5 className="mb-1">Crop Profile Image</h5>
                        <p className="text-muted mb-0">Move and zoom the circle, then save the cropped avatar.</p>
                      </div>
                      <div className="d-flex gap-2">
                        <button type="button" className="btn btn-light" onClick={handleCropCancel} disabled={avatarUploading}>
                          Cancel
                        </button>
                        <button type="button" className="btn btn-premium btn-premium-primary" onClick={uploadCroppedAvatar} disabled={avatarUploading}>
                          {avatarUploading ? <span className="spinner-border spinner-border-sm"></span> : 'Save Image'}
                        </button>
                      </div>
                    </div>
                    <div style={{ position: 'relative', width: '100%', height: '420px', background: '#111' }}>
                      <Cropper
                        image={selectedAvatar.previewUrl}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                      />
                    </div>
                    <div className="p-4">
                      <div className="d-flex align-items-center gap-3 mb-4">
                        <label className="form-label mb-0 fw-semibold">Zoom</label>
                        <input
                          type="range"
                          min={1}
                          max={3}
                          step={0.1}
                          value={zoom}
                          onChange={(e) => setZoom(Number(e.target.value))}
                          className="form-range"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {user.bio && (
                  <div className="bg-light p-4 rounded-xl mb-5">
                      <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                        <LuUser className="text-primary" /> About Me
                      </h5>
                      <p className="text-secondary leading-relaxed mb-0">{user.bio}</p>
                  </div>
              )}

              <div className="d-grid d-md-flex flex-wrap gap-4 gap-md-5 justify-content-center justify-content-md-start" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                  {profileStats.map(s => (
                      <div key={s.label} className="text-center text-md-start">
                          <h3 className={`fw-bold mb-0 fs-3 ${s.color}`}>{s.value}</h3>
                          <small className="text-muted fw-semibold text-uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>{s.label}</small>
                      </div>
                  ))}
              </div>
            </div>
          </motion.div>

          <div className="row g-4">
            <div className="col-md-6">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card h-100 border-0 shadow bg-white p-3 p-md-4"
              >
                <div className="d-flex align-items-center gap-3 mb-4">
                    <div className="bg-primary-light text-primary p-3 rounded-circle"><LuBookOpen size={28} /></div>
                    <h4 className="fw-bold mb-0">I Can Teach</h4>
                </div>
                <div className="d-flex flex-wrap gap-3">
                    {user.teachSkills?.length > 0 ? (
                        user.teachSkills.map((s, idx) => (
                        <span key={idx} className="skill-tag skill-tag-teach flex-grow-1 justify-content-center py-2 px-4 shadow-sm">
                            <LuCircleCheck size={16} /> {renderSkill(s)}
                        </span>
                        ))
                    ) : (
                        <div className="text-center w-100 py-3 text-muted fst-italic">No teaching skills shared yet.</div>
                    )}
                </div>
              </motion.div>
            </div>
            
            <div className="col-md-6">
               <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card h-100 border-0 shadow bg-white p-3 p-md-4"
              >
                <div className="d-flex align-items-center gap-3 mb-4">
                    <div className="bg-success-light text-success p-3 rounded-circle"><LuGraduationCap size={28} /></div>
                    <h4 className="fw-bold mb-0">I Want to Learn</h4>
                </div>
                <div className="d-flex flex-wrap gap-3">
                    {user.learnSkills?.length > 0 ? (
                        user.learnSkills.map((s, idx) => (
                        <span key={idx} className="skill-tag skill-tag-learn flex-grow-1 justify-content-center py-2 px-4 shadow-sm">
                            <LuGraduationCap size={16} /> {renderSkill(s)}
                        </span>
                        ))
                    ) : (
                        <div className="text-center w-100 py-3 text-muted fst-italic">No learning goals added yet.</div>
                    )}
                </div>
              </motion.div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}