import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LuPhone, LuVideo, LuVideoOff, LuMic, LuMicOff, LuPhoneOff, LuMaximize2, LuMinimize2, LuUser } from 'react-icons/lu';
import { getSocket } from '../services/socket';
import toast from 'react-hot-toast';

// TURN servers are REQUIRED for production WebRTC (STUN alone fails behind NAT/firewalls)
const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

// callState: 'idle' | 'calling' | 'incoming' | 'connected'
export default function VideoCallOverlay({ user, activeConv, incomingCall, onEndCall }) {
  const [callState, setCallState] = useState('idle');
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [remoteUser, setRemoteUser] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidates = useRef([]);
  const remoteDescSet = useRef(false);
  const callStateRef = useRef('idle');

  const socket = getSocket();

  // Keep ref in sync
  useEffect(() => { callStateRef.current = callState; }, [callState]);

  const stopStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const closePC = () => {
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    pendingCandidates.current = [];
    remoteDescSet.current = false;
  };

  const cleanUp = useCallback((notify = true) => {
    stopStream();
    closePC();
    setCallState('idle');
    setMuted(false);
    setVideoOff(false);
    setIsMinimized(false);
    setRemoteUser(null);
    if (notify && onEndCall) onEndCall();
  }, [onEndCall]);

  const getStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      console.error('Media error:', err);
      toast.error('Could not access camera/mic. Check browser permissions.');
      return null;
    }
  };

  const createPC = useCallback((remoteId) => {
    closePC();
    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcRef.current = pc;

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket) {
        socket.emit('ice-candidate', { to: remoteId, candidate });
      }
    };

    pc.ontrack = (event) => {
      console.log('[WebRTC] remote track received');
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      console.log('[WebRTC] ICE:', s);
      if (s === 'connected' || s === 'completed') {
        setCallState('connected');
      }
      if (s === 'failed') {
        toast.error('Connection failed. Try again.');
        cleanUp();
      }
    };

    return pc;
  }, [socket, cleanUp]);

  const drainCandidates = async (pc) => {
    while (pendingCandidates.current.length > 0) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(pendingCandidates.current.shift()));
      } catch (e) { console.warn('Queued ICE error:', e); }
    }
  };

  // ── Outgoing call ──────────────────────────────────────────────────
  const startCall = useCallback(async (conv) => {
    if (callStateRef.current !== 'idle') return;
    const remoteId = conv?.participant?.id || conv?.participant?._id;
    if (!remoteId || !socket) return;

    setCallState('calling');
    setRemoteUser(conv.participant);

    const stream = await getStream();
    if (!stream) { setCallState('idle'); return; }

    const pc = createPC(remoteId);
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      socket.emit('call-user', {
        to: remoteId,
        offer: pc.localDescription,
        fromName: user?.name,
        fromAvatar: user?.avatar,
        callerId: String(user?.id || user?._id),
      });
    } catch (err) {
      console.error('startCall error:', err);
      toast.error('Failed to initiate call');
      cleanUp();
    }
  }, [socket, user, createPC, cleanUp]);

  // ── Accept incoming call ───────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    if (!incomingCall || callStateRef.current !== 'incoming') return;
    const remoteId = incomingCall.callerId || incomingCall.from;
    if (!remoteId || !socket) return;

    setCallState('connected');

    const stream = await getStream();
    if (!stream) { setCallState('idle'); return; }

    const pc = createPC(remoteId);
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      remoteDescSet.current = true;
      await drainCandidates(pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer-call', { to: remoteId, answer: pc.localDescription });
    } catch (err) {
      console.error('acceptCall error:', err);
      toast.error('Failed to accept call');
      cleanUp();
    }
  }, [incomingCall, socket, createPC, cleanUp]);

  const rejectCall = useCallback(() => {
    const remoteId = incomingCall?.callerId || incomingCall?.from;
    if (remoteId && socket) socket.emit('end-call', { to: remoteId });
    cleanUp();
  }, [incomingCall, socket, cleanUp]);

  const endCall = useCallback(() => {
    const remoteId =
      (remoteUser?.id || remoteUser?._id) ||
      (activeConv?.participant?.id || activeConv?.participant?._id) ||
      (incomingCall?.callerId || incomingCall?.from);
    if (remoteId && socket) socket.emit('end-call', { to: remoteId });
    cleanUp();
  }, [remoteUser, activeConv, incomingCall, socket, cleanUp]);

  // ── Socket listeners ───────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleAnswer = async ({ answer }) => {
      if (!pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        remoteDescSet.current = true;
        await drainCandidates(pcRef.current);
        setCallState('connected');
      } catch (err) { console.error('handleAnswer error:', err); }
    };

    const handleCandidate = async ({ candidate }) => {
      if (!candidate) return;
      if (pcRef.current && remoteDescSet.current) {
        try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); }
        catch (e) { console.warn('addICE error:', e); }
      } else {
        pendingCandidates.current.push(candidate);
      }
    };

    const handleCallEnded = () => {
      toast('Call ended', { icon: '📞' });
      cleanUp(false);
      if (onEndCall) onEndCall();
    };

    socket.on('call-answered', handleAnswer);
    socket.on('ice-candidate', handleCandidate);
    socket.on('call-ended', handleCallEnded);

    return () => {
      socket.off('call-answered', handleAnswer);
      socket.off('ice-candidate', handleCandidate);
      socket.off('call-ended', handleCallEnded);
    };
  }, [socket, cleanUp, onEndCall]);

  // Show incoming ring
  useEffect(() => {
    if (incomingCall && callStateRef.current === 'idle') {
      setCallState('incoming');
      setRemoteUser({ name: incomingCall.fromName, avatar: incomingCall.fromAvatar });
    }
  }, [incomingCall]);

  // Trigger outgoing call when activeConv changes
  useEffect(() => {
    if (activeConv && callStateRef.current === 'idle') {
      startCall(activeConv);
    }
  }, [activeConv]);

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const t = localStreamRef.current.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setMuted(!t.enabled); }
  };

  const toggleVideo = () => {
    if (!localStreamRef.current) return;
    const t = localStreamRef.current.getVideoTracks()[0];
    if (t) { t.enabled = !t.enabled; setVideoOff(!t.enabled); }
  };

  const isActive = callState !== 'idle';

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          key="vc-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`vc-overlay ${isMinimized ? 'vc-minimized' : ''}`}
        >
          {/* ── Incoming Ring UI ── */}
          {callState === 'incoming' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="vc-ring-card"
            >
              <div className="text-center mb-4">
                <div className="position-relative d-inline-block">
                  <img
                    src={remoteUser?.avatar || '/default-avatar.png'}
                    className="vc-avatar-ring"
                    width="120" height="120" alt="caller"
                  />
                  <div className="vc-video-badge"><LuVideo size={16} className="text-white" /></div>
                </div>
                <h3 className="fw-bold mt-3 mb-1">{remoteUser?.name || 'Someone'}</h3>
                <p className="text-secondary mb-0">Incoming video call...</p>
              </div>
              <div className="d-flex justify-content-center gap-5">
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={rejectCall} className="vc-btn-circle bg-danger">
                  <LuPhoneOff size={28} />
                </motion.button>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={acceptCall} className="vc-btn-circle bg-success vc-bounce">
                  <LuPhone size={28} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── Active Call UI ── */}
          {(callState === 'calling' || callState === 'connected') && (
            <motion.div layout
              className={`vc-window ${isMinimized ? 'vc-window-mini' : 'vc-window-full'}`}
            >
              <div className="position-relative w-100 h-100 overflow-hidden bg-dark">
                {/* Remote video – full screen */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="vc-remote-video"
                />

                {/* Waiting overlay while still "calling" */}
                {callState === 'calling' && (
                  <div className="vc-calling-overlay">
                    <motion.img
                      src={remoteUser?.avatar || '/default-avatar.png'}
                      animate={{ scale: [1, 1.07, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="rounded-circle mb-3 shadow"
                      style={{ border: '4px solid #2563eb' }}
                      width="140" height="140" alt=""
                    />
                    <h2 className="fw-bold text-white mb-2">{remoteUser?.name}</h2>
                    <div className="d-flex align-items-center gap-2 text-white opacity-75">
                      <span className="spinner-grow spinner-grow-sm text-primary" />
                      <span>Calling...</span>
                    </div>
                  </div>
                )}

                {/* Local PIP camera */}
                {!isMinimized && (
                  <div className="vc-pip">
                    <video ref={localVideoRef} autoPlay playsInline muted className="vc-pip-video" />
                    {videoOff && (
                      <div className="vc-pip-off">
                        <LuUser size={28} className="text-white" />
                      </div>
                    )}
                  </div>
                )}

                {/* Controls bar */}
                <div className={`vc-controls ${isMinimized ? 'vc-controls-mini' : ''}`}>
                  <div className="vc-ctrl-bar">
                    <button
                      onClick={toggleMute}
                      className={`vc-btn ${muted ? 'vc-btn-red' : ''}`}
                      title={muted ? 'Unmute' : 'Mute'}
                    >
                      {muted ? <LuMicOff size={20} /> : <LuMic size={20} />}
                    </button>
                    <button onClick={endCall} className="vc-btn vc-btn-end" title="End Call">
                      <LuPhoneOff size={24} />
                    </button>
                    <button
                      onClick={toggleVideo}
                      className={`vc-btn ${videoOff ? 'vc-btn-red' : ''}`}
                      title={videoOff ? 'Show camera' : 'Hide camera'}
                    >
                      {videoOff ? <LuVideoOff size={20} /> : <LuVideo size={20} />}
                    </button>
                    <button
                      onClick={() => setIsMinimized(m => !m)}
                      className="vc-btn d-none d-md-flex"
                      title="Minimize"
                    >
                      {isMinimized ? <LuMaximize2 size={18} /> : <LuMinimize2 size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <style dangerouslySetInnerHTML={{ __html: `
            .vc-overlay {
              position: fixed; inset: 0; z-index: 99999;
              display: flex; align-items: center; justify-content: center;
              background: rgba(0,0,0,0.9); backdrop-filter: blur(20px);
            }
            .vc-overlay.vc-minimized {
              background: transparent !important; backdrop-filter: none !important;
              pointer-events: none;
            }
            .vc-ring-card {
              background: #fff; border-radius: 1.75rem;
              padding: 2.5rem 2rem; width: 360px; max-width: 92vw;
              box-shadow: 0 32px 64px rgba(0,0,0,0.45);
            }
            .vc-avatar-ring {
              border-radius: 50%; object-fit: cover;
              border: 4px solid #2563eb;
            }
            .vc-video-badge {
              position: absolute; bottom: 2px; right: 2px;
              background: #22c55e; border-radius: 50%;
              width: 34px; height: 34px;
              display: flex; align-items: center; justify-content: center;
              border: 3px solid white;
            }
            .vc-btn-circle {
              width: 72px; height: 72px; border-radius: 50%; border: none;
              display: flex; align-items: center; justify-content: center;
              color: white; cursor: pointer; transition: opacity .15s;
            }
            .vc-btn-circle:hover { opacity: .85; }
            .vc-bounce { animation: vcB 1.6s ease-in-out infinite; }
            @keyframes vcB { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }

            .vc-window { border-radius: 2rem; overflow: hidden; }
            .vc-window-full {
              width: 95vw; height: 92vh;
              box-shadow: 0 30px 80px rgba(0,0,0,0.7);
            }
            .vc-window-mini {
              position: fixed; bottom: 1.5rem; right: 1.5rem;
              width: 220px; height: 310px; border-radius: 1.25rem;
              pointer-events: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            }
            @media (max-width: 768px) {
              .vc-window-full { width:100vw; height:100vh; border-radius:0; }
              .vc-pip { width:100px!important; height:140px!important; bottom:6rem!important; right:.75rem!important; }
              .vc-controls { bottom:1rem!important; }
            }

            .vc-remote-video {
              width: 100%; height: 100%; object-fit: cover; display: block;
            }
            .vc-calling-overlay {
              position:absolute; inset:0; z-index:10;
              display:flex; flex-direction:column;
              align-items:center; justify-content:center;
              background:rgba(0,0,0,0.55);
            }
            .vc-pip {
              position:absolute; bottom:4rem; right:1.5rem;
              width:160px; height:120px; border-radius:.9rem; overflow:hidden;
              border:2px solid rgba(255,255,255,.25); z-index:20;
              background:#1e293b; box-shadow:0 4px 24px rgba(0,0,0,.5);
            }
            .vc-pip-video { width:100%; height:100%; object-fit:cover; }
            .vc-pip-off {
              position:absolute; inset:0; background:#334155;
              display:flex; align-items:center; justify-content:center;
            }

            .vc-controls {
              position:absolute; bottom:2rem; left:50%; transform:translateX(-50%); z-index:30;
            }
            .vc-controls-mini { bottom:0; transform:translateX(-50%) scale(.7); }
            .vc-ctrl-bar {
              display:flex; align-items:center; gap:.75rem;
              background:rgba(0,0,0,.55); backdrop-filter:blur(16px);
              border:1px solid rgba(255,255,255,.12);
              border-radius:9999px; padding:.65rem 1.25rem;
            }
            .vc-btn {
              width:52px; height:52px; border-radius:50%; border:none;
              display:flex; align-items:center; justify-content:center;
              background:rgba(255,255,255,.15); color:#fff; cursor:pointer;
              transition:background .15s;
            }
            .vc-btn:hover { background:rgba(255,255,255,.25); }
            .vc-btn-red { background:#ef4444 !important; }
            .vc-btn-red:hover { background:#dc2626 !important; }
            .vc-btn-end {
              width:64px; height:64px;
              background:#ef4444 !important;
            }
            .vc-btn-end:hover { background:#dc2626 !important; }
          `}} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
