import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LuPhone, LuVideo, LuVideoOff, LuMic, LuMicOff, LuX, LuPhoneOff, LuMaximize2, LuMinimize2, LuUser } from 'react-icons/lu';
import { getSocket } from '../services/socket';
import toast from 'react-hot-toast';

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function VideoCallOverlay({ user, activeConv, incomingCall, onEndCall }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isCalling, setIsCalling] = useState(false);
  const [isIncoming, setIsIncoming] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const pc = useRef();
  const socket = getSocket();

  // Signaling state tracking to avoid illegal state transitions
  const isNegotiating = useRef(false);
  const pendingCandidates = useRef([]);

  // Cleanup function
  const cleanUp = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setIsCalling(false);
    setIsIncoming(false);
    setIsAccepted(false);
    isNegotiating.current = false;
    pendingCandidates.current = [];
    if (onEndCall) onEndCall();
  }, [localStream, onEndCall]);

  const initLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      toast.error('Could not access camera/microphone');
      cleanUp();
      return null;
    }
  };

  const createPeerConnection = useCallback((otherUserId) => {
    const pcInstance = new RTCPeerConnection(STUN_SERVERS);

    pcInstance.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { to: otherUserId, candidate: event.candidate });
      }
    };

    pcInstance.ontrack = (event) => {
      console.log('Remote track received:', event.streams[0]);
      setRemoteStream(event.streams[0]);
    };

    pcInstance.oniceconnectionstatechange = () => {
      console.log('ICE state:', pcInstance.iceConnectionState);
      if (pcInstance.iceConnectionState === 'connected') {
        toast.success('Video connected!');
      } else if (pcInstance.iceConnectionState === 'failed') {
        toast.error('Connection failed. Please try again.');
        cleanUp();
      }
    };

    pcInstance.onnegotiationneeded = async () => {
        if (isNegotiating.current) return;
        isNegotiating.current = true;
        try {
            const offer = await pcInstance.createOffer();
            await pcInstance.setLocalDescription(offer);
            socket.emit('call-user', {
              to: otherUserId,
              offer,
              fromName: user?.name,
              fromAvatar: user?.avatar
            });
        } catch (err) {
            console.error('Negotiation error:', err);
        } finally {
            isNegotiating.current = false;
        }
    };

    return pcInstance;
  }, [socket, user]);

  // Start a call
  const startCall = async () => {
    if (!activeConv) return;
    if (localStream || pc.current) {
        cleanUp();
    }
    setIsCalling(true);
    const stream = await initLocalStream();
    if (!stream) return;

    const otherUserId = activeConv.participant?.id || activeConv.participant?._id;
    pc.current = createPeerConnection(otherUserId);
    stream.getTracks().forEach(track => pc.current.addTrack(track, stream));
  };

  // Accept incoming call
  const acceptCall = async () => {
    if (!incomingCall) return;
    setIsAccepted(true);
    setIsIncoming(false);

    const stream = await initLocalStream();
    if (!stream) return;

    const otherUserId = incomingCall.callerId || incomingCall.from;
    pc.current = createPeerConnection(otherUserId);
    stream.getTracks().forEach(track => pc.current.addTrack(track, stream));

    await pc.current.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));

    // Process queued candidates
    while (pendingCandidates.current.length > 0) {
      const cand = pendingCandidates.current.shift();
      try {
        await pc.current.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {
        console.error('Error adding queued candidate:', e);
      }
    }

    const answer = await pc.current.createAnswer();
    await pc.current.setLocalDescription(answer);

    if (socket) {
      socket.emit('answer-call', { to: otherUserId, answer });
    }
  };

  // Reject call
  const rejectCall = () => {
    const otherUserId = incomingCall?.callerId || incomingCall?.from;
    if (otherUserId && socket) {
      socket.emit('end-call', { to: otherUserId });
    }
    cleanUp();
  };

  const endCall = () => {
    const otherUserId = (activeConv?.participant?.id || activeConv?.participant?._id) || (incomingCall?.callerId || incomingCall?.from);
    if (otherUserId && socket) {
      socket.emit('end-call', { to: otherUserId });
    }
    cleanUp();
  };

  useEffect(() => {
    if (incomingCall && !isAccepted) {
      setIsIncoming(true);
    } else if (!incomingCall) {
      setIsIncoming(false);
    }
  }, [incomingCall, isAccepted]);

  useEffect(() => {
    if (!socket) return;

    const handleAnswer = async ({ answer }) => {
      try {
          if (pc.current) {
              await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
              
              // Process queued candidates
              while (pendingCandidates.current.length > 0) {
                const cand = pendingCandidates.current.shift();
                try {
                  await pc.current.addIceCandidate(new RTCIceCandidate(cand));
                } catch (e) {
                  console.error('Error adding queued candidate:', e);
                }
              }

              setIsAccepted(true);
              setIsCalling(false);
          }
      } catch (err) {
          console.error('Handle answer error:', err);
      }
    };

    const handleCandidate = async ({ candidate }) => {
      try {
        if (pc.current && pc.current.remoteDescription) {
          await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          // Queue candidates arriving before remote description
          pendingCandidates.current.push(candidate);
        }
      } catch (e) {
        console.error('Error adding received ice candidate', e);
      }
    };

    const handleCallEnded = () => {
      toast('Call ended', { icon: '📞' });
      cleanUp();
    };

    socket.on('call-answered', handleAnswer);
    socket.on('ice-candidate', handleCandidate);
    socket.on('call-ended', handleCallEnded);

    return () => {
      socket.off('call-answered', handleAnswer);
      socket.off('ice-candidate', handleCandidate);
      socket.off('call-ended', handleCallEnded);
    };
  }, [socket, cleanUp]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Start call logic trigger
  useEffect(() => {
    // If activeConv is passed and we aren't already in a call/incoming, start it
    if (activeConv && !isCalling && !isAccepted && !isIncoming) {
      startCall();
    }
  }, [activeConv]);

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled;
          setMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
          videoTrack.enabled = !videoTrack.enabled;
          setVideoOff(!videoTrack.enabled);
      }
    }
  };

  // if (!isIncoming && !isCalling && !isAccepted) return null; // moved inside AnimatePresence 

  const active = isIncoming || isCalling || isAccepted;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`video-call-fixed-overlay ${isMinimized ? 'minimized' : ''}`}
          style={{ cursor: 'default' }}
        >
          {/* Incoming Call UI */}
          {isIncoming && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-4 shadow-2xl p-5 text-center call-notif-box"
              style={{ width: '380px' }}
            >
              <div className="mb-4">
                <div className="position-relative d-inline-block">
                    <img src={incomingCall.fromAvatar || "/default-avatar.png"} className="rounded-circle border-4 border-primary" width="120" height="120" alt="Caller" />
                    <div className="position-absolute bottom-0 end-0 bg-success rounded-circle border-4 border-white aspect-square d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                        <LuVideo className="text-white" size={20} />
                    </div>
                </div>
                <h3 className="fw-bold mt-4 mb-1">{incomingCall.fromName}</h3>
                <p className="text-secondary fw-semibold">Wants to video chat...</p>
              </div>
              <div className="d-flex justify-content-center gap-4">
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); rejectCall(); }} 
                  className="btn btn-danger btn-call-circle shadow-lg"
                  style={{ pointerEvents: 'auto', position: 'relative', zIndex: 100, cursor: 'pointer' }}
                >
                  <LuPhoneOff size={28} />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); acceptCall(); }} 
                  className="btn btn-success btn-call-circle shadow-lg animate-bounce-slow"
                  style={{ pointerEvents: 'auto', position: 'relative', zIndex: 100, cursor: 'pointer' }}
                >
                  <LuPhone size={28} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Active Call UI */}
          {(isCalling || isAccepted) && (
            <motion.div
              layout
              className={`video-window glass-card overflow-hidden ${isMinimized ? 'minimized-window shadow-2xl' : 'fullscreen-window'}`}
            >
              <div className="h-100 w-100 position-relative bg-dark">
                {/* Remote Stream */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-100 h-100 object-cover"
                />

                {/* Calling State Info */}
                {!isAccepted && isCalling && (
                  <div className="position-absolute top-50 start-50 translate-middle text-center text-white z-2">
                    <div className="mb-4">
                        <motion.img 
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            src={activeConv.participant?.avatar || "/default-avatar.png"} 
                            className="rounded-circle border-4 border-primary-light shadow-xl" 
                            width="140" height="140" 
                        />
                    </div>
                    <h2 className="fw-bold mb-2">{activeConv.participant?.name}</h2>
                    <div className="d-flex align-items-center justify-content-center gap-2">
                        <span className="spinner-grow spinner-grow-sm text-primary"></span>
                        <p className="mb-0 fw-semibold opacity-75">Calling Partner...</p>
                    </div>
                  </div>
                )}

                {/* Local Preview */}
                <div className={`local-preview-container shadow-2xl border border-white border-opacity-25 rounded-3 overflow-hidden ${isMinimized ? 'd-none' : ''}`}>
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-100 h-100 object-cover"
                  />
                  {videoOff && (
                    <div className="position-absolute top-0 start-0 w-100 h-100 bg-secondary d-flex align-items-center justify-content-center">
                        <LuUser className="text-white" size={40} />
                    </div>
                  )}
                </div>

                {/* Overlay Controls */}
                <div className={`controls-container ${isMinimized ? 'minimized-controls' : 'p-5'}`}>
                   <div className="glass-panel p-3 rounded-pill d-flex align-items-center gap-4 px-4 shadow-xl">
                      <button onClick={toggleMute} className={`btn btn-icon ${muted ? 'btn-danger' : 'btn-light-subtle'}`}>
                        {muted ? <LuMicOff /> : <LuMic />}
                      </button>
                      <button onClick={endCall} className="btn btn-danger btn-end rounded-circle shadow-lg">
                        <LuPhoneOff size={32} />
                      </button>
                      <button onClick={toggleVideo} className={`btn btn-icon ${videoOff ? 'btn-danger' : 'btn-light-subtle'}`}>
                        {videoOff ? <LuVideoOff /> : <LuVideo />}
                      </button>
                      <button onClick={() => setIsMinimized(!isMinimized)} className="btn btn-icon btn-light-subtle d-none d-md-flex">
                        {isMinimized ? <LuMaximize2 size={20} /> : <LuMinimize2 size={20} />}
                      </button>
                   </div>
                </div>
              </div>
            </motion.div>
          )}

          <style dangerouslySetInnerHTML={{ __html: `
            .video-call-fixed-overlay {
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 99999;
              background: rgba(15, 23, 42, 0.9);
              backdrop-filter: blur(20px);
            }
            .video-call-fixed-overlay.minimized {
              background: transparent;
              backdrop-filter: none;
              pointer-events: none;
            }
            .btn-call-circle {
              width: 70px;
              height: 70px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              border: none;
            }
            .fullscreen-window {
              width: 95vw;
              height: 92vh;
              border-radius: 2.5rem;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            }
            @media (max-width: 768px) {
              .fullscreen-window {
                width: 100vw;
                height: 100vh;
                border-radius: 0;
              }
              .local-preview-container {
                width: 110px !important;
                height: 160px !important;
                bottom: 7rem !important;
                right: 1.5rem !important;
                border-radius: 1rem !important;
              }
              .controls-container {
                bottom: 2rem !important;
              }
              .btn-icon {
                width: 50px !important;
                height: 50px !important;
              }
              .btn-end {
                width: 70px !important;
                height: 70px !important;
              }
            }
            .minimized-window {
              position: fixed;
              bottom: 2rem;
              right: 2rem;
              width: 260px;
              height: 380px;
              border-radius: 2rem;
              pointer-events: auto;
            }
            .local-preview-container {
              position: absolute;
              bottom: 3.5rem;
              right: 3.5rem;
              width: 240px;
              height: 160px;
              z-index: 100;
              background: #1e293b;
              border: 2px solid rgba(255, 255, 255, 0.2);
              border-radius: 1.5rem;
              transition: all 0.3s ease;
            }
            .controls-container {
              position: absolute;
              bottom: 4rem;
              left: 50%;
              transform: translateX(-50%);
              z-index: 200;
              width: fit-content;
            }
            .controls-container.minimized-controls {
              bottom: 1rem;
              transform: translateX(-50%) scale(0.65);
            }
            .glass-panel {
              background: rgba(15, 23, 42, 0.6);
              backdrop-filter: blur(20px);
              border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .btn-icon {
              width: 60px;
              height: 60px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.25rem;
            }
            .btn-light-subtle {
              background: rgba(255, 255, 255, 0.15);
              color: white;
              border: none;
            }
            .btn-light-subtle:hover {
              background: rgba(255, 255, 255, 0.25);
              color: white;
            }
            .btn-end {
              width: 80px;
              height: 80px;
            }
            .animate-bounce-slow {
              animation: bounce 2s infinite;
            }
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
            .object-cover { object-fit: cover; }
          `}} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
