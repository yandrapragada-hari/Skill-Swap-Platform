import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LuPhone, LuVideo, LuVideoOff, LuMic, LuMicOff, LuPhoneOff, LuMaximize2, LuMinimize2, LuUser } from 'react-icons/lu';
import { getSocket } from '../services/socket';
import toast from 'react-hot-toast';

const ICE = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
  iceCandidatePoolSize: 10,
};

export default function VideoCallOverlay({ user, activeConv, incomingCall, onEndCall }) {
  const [phase, setPhase]       = useState('idle'); // idle|calling|incoming|connected
  const [muted, setMuted]       = useState(false);
  const [vidOff, setVidOff]     = useState(false);
  const [mini, setMini]         = useState(false);
  const [peerName, setPeerName] = useState('');
  const [peerAva, setPeerAva]   = useState('');

  const phaseRef   = useRef('idle');
  const pcRef      = useRef(null);
  const localRef   = useRef(null); // MediaStream
  const localVid   = useRef(null); // <video>
  const remoteVid  = useRef(null); // <video>
  const iceBuf     = useRef([]);
  const remoteSet  = useRef(false);
  const peerIdRef  = useRef(null);

  const go = (p) => { phaseRef.current = p; setPhase(p); };

  /* ── get fresh socket every time ────────────────────── */
  const S = () => getSocket();

  /* ── clean up ────────────────────────────────────────── */
  const stopMedia = () => {
    localRef.current?.getTracks().forEach(t => t.stop());
    localRef.current = null;
    if (localVid.current)  localVid.current.srcObject  = null;
    if (remoteVid.current) remoteVid.current.srcObject = null;
  };

  const destroyPC = () => {
    pcRef.current?.close();
    pcRef.current = null;
    iceBuf.current = [];
    remoteSet.current = false;
  };

  const reset = useCallback((notify = true) => {
    stopMedia();
    destroyPC();
    go('idle');
    setMuted(false); setVidOff(false); setMini(false);
    setPeerName(''); setPeerAva('');
    peerIdRef.current = null;
    if (notify) onEndCall?.();
  }, [onEndCall]);

  /* ── camera ──────────────────────────────────────────── */
  const getCam = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localRef.current = s;
      if (localVid.current) localVid.current.srcObject = s;
      return s;
    } catch {
      toast.error('Camera/mic blocked. Allow access in browser settings.');
      return null;
    }
  };

  /* ── build RTCPeerConnection ─────────────────────────── */
  const buildPC = (peerId) => {
    destroyPC();
    peerIdRef.current = peerId;
    const pc = new RTCPeerConnection(ICE);
    pcRef.current = pc;

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) S()?.emit('ice-candidate', { to: peerId, candidate });
    };

    pc.ontrack = (e) => {
      if (remoteVid.current && e.streams?.[0]) {
        remoteVid.current.srcObject = e.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'connected') go('connected');
      if (s === 'failed' || s === 'disconnected') { toast.error('Call dropped.'); reset(); }
    };

    return pc;
  };

  const drainICE = async (pc) => {
    for (const c of iceBuf.current) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    iceBuf.current = [];
  };

  /* ── outgoing call ───────────────────────────────────── */
  const startCall = async (conv) => {
    if (phaseRef.current !== 'idle') return;
    const peerId = String(conv?.participant?.id || conv?.participant?._id || '');
    const myId   = String(user?.id || user?._id || '');
    if (!peerId || !myId) { toast.error('Cannot identify peer'); return; }

    go('calling');
    setPeerName(conv.participant?.name || '');
    setPeerAva(conv.participant?.avatar || '');

    const stream = await getCam();
    if (!stream) { go('idle'); return; }

    const pc = buildPC(peerId);
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
    await pc.setLocalDescription(offer);

    S()?.emit('call-user', {
      to: peerId,
      offer: pc.localDescription,
      fromName:   user?.name,
      fromAvatar: user?.avatar,
      callerId:   myId,
    });
  };

  /* ── accept call ─────────────────────────────────────── */
  const acceptCall = async () => {
    if (phaseRef.current !== 'incoming' || !incomingCall) return;
    const peerId = String(incomingCall.callerId || incomingCall.from || '');
    if (!peerId) return;

    go('connected');

    const stream = await getCam();
    if (!stream) { go('idle'); return; }

    const pc = buildPC(peerId);
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
    remoteSet.current = true;
    await drainICE(pc);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    S()?.emit('answer-call', { to: peerId, answer: pc.localDescription });
  };

  const rejectCall = () => {
    S()?.emit('end-call', { to: String(incomingCall?.callerId || incomingCall?.from || '') });
    reset();
  };

  const hangUp = () => {
    S()?.emit('end-call', { to: peerIdRef.current });
    reset();
  };

  /* ── socket listeners (attach once, retry if needed) ─── */
  useEffect(() => {
    let attached = false;
    let timer;

    const setup = () => {
      const s = getSocket();
      if (!s || attached) return;
      attached = true;

      s.on('call-answered', async ({ answer }) => {
        if (!pcRef.current) return;
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        remoteSet.current = true;
        await drainICE(pcRef.current);
        go('connected');
      });

      s.on('ice-candidate', async ({ candidate }) => {
        if (!candidate) return;
        if (pcRef.current && remoteSet.current) {
          try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
        } else {
          iceBuf.current.push(candidate);
        }
      });

      s.on('call-ended', () => {
        toast('Call ended', { icon: '📞' });
        reset(false);
        onEndCall?.();
      });

      clearInterval(timer);
    };

    setup();
    if (!attached) timer = setInterval(setup, 500);

    return () => {
      clearInterval(timer);
      const s = getSocket();
      if (s) { s.off('call-answered'); s.off('ice-candidate'); s.off('call-ended'); }
    };
  }, []); // eslint-disable-line

  /* ── react to prop changes ───────────────────────────── */
  useEffect(() => {
    if (incomingCall && phaseRef.current === 'idle') {
      go('incoming');
      setPeerName(incomingCall.fromName || '');
      setPeerAva(incomingCall.fromAvatar || '');
    }
  }, [incomingCall]);

  useEffect(() => {
    if (activeConv && phaseRef.current === 'idle') startCall(activeConv);
  }, [activeConv]); // eslint-disable-line

  const toggleMute = () => {
    const t = localRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setMuted(!t.enabled); }
  };
  const toggleVid = () => {
    const t = localRef.current?.getVideoTracks()[0];
    if (t) { t.enabled = !t.enabled; setVidOff(!t.enabled); }
  };

  if (phase === 'idle') return null;

  return (
    <AnimatePresence>
      <motion.div key="vc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className={`vc-ol${mini ? ' vc-ol-mini' : ''}`}>

        {/* ── Incoming ring ── */}
        {phase === 'incoming' && (
          <motion.div initial={{ scale: .8 }} animate={{ scale: 1 }} className="vc-ring">
            <div className="text-center mb-4">
              <div className="position-relative d-inline-block">
                <img src={peerAva || '/default-avatar.png'} width="110" height="110"
                  style={{ objectFit:'cover', borderRadius:'50%', border:'4px solid #2563eb' }} alt="" />
                <div className="vc-vid-dot"><LuVideo size={14} className="text-white" /></div>
              </div>
              <h4 className="fw-bold mt-3 mb-0">{peerName || 'Someone'}</h4>
              <p className="text-muted small">Incoming video call…</p>
            </div>
            <div className="d-flex justify-content-center gap-5">
              <motion.button whileTap={{ scale:.9 }} onClick={rejectCall} className="vc-cir bg-danger border-0 text-white">
                <LuPhoneOff size={26} />
              </motion.button>
              <motion.button whileTap={{ scale:.9 }} onClick={acceptCall} className="vc-cir bg-success border-0 text-white vc-pulse">
                <LuPhone size={26} />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── Active call ── */}
        {(phase === 'calling' || phase === 'connected') && (
          <motion.div layout className={`vc-win ${mini ? 'vc-win-s' : 'vc-win-l'}`}>
            <div className="position-relative w-100 h-100 overflow-hidden bg-dark">

              {/* Remote full-screen video */}
              <video ref={remoteVid} autoPlay playsInline
                style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />

              {/* Waiting overlay */}
              {phase === 'calling' && (
                <div className="vc-waiting">
                  <motion.img src={peerAva || '/default-avatar.png'}
                    animate={{ scale:[1,1.07,1] }} transition={{ repeat:Infinity, duration:2 }}
                    width="130" height="130"
                    style={{ objectFit:'cover', borderRadius:'50%', border:'4px solid #3b82f6' }} alt="" />
                  <h3 className="text-white fw-bold mt-3">{peerName}</h3>
                  <div className="d-flex align-items-center gap-2 text-white-50 mt-1">
                    <span className="spinner-grow spinner-grow-sm text-primary" />
                    <small>Ringing…</small>
                  </div>
                </div>
              )}

              {/* Local PIP */}
              {!mini && (
                <div className="vc-pip">
                  <video ref={localVid} autoPlay playsInline muted
                    style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  {vidOff && (
                    <div style={{ position:'absolute', inset:0, background:'#334155', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <LuUser size={28} className="text-white" />
                    </div>
                  )}
                </div>
              )}

              {/* Controls */}
              <div className={`vc-ctrl${mini ? ' vc-ctrl-s' : ''}`}>
                <div className="vc-bar">
                  <button onClick={toggleMute} className={`vc-b${muted?' vc-b-r':''}`} title={muted?'Unmute':'Mute'}>
                    {muted ? <LuMicOff size={20}/> : <LuMic size={20}/>}
                  </button>
                  <button onClick={hangUp} className="vc-b vc-b-end" title="End Call">
                    <LuPhoneOff size={22}/>
                  </button>
                  <button onClick={toggleVid} className={`vc-b${vidOff?' vc-b-r':''}`} title="Camera">
                    {vidOff ? <LuVideoOff size={20}/> : <LuVideo size={20}/>}
                  </button>
                  <button onClick={() => setMini(m=>!m)} className="vc-b d-none d-md-flex">
                    {mini ? <LuMaximize2 size={18}/> : <LuMinimize2 size={18}/>}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <style>{`
          .vc-ol{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.88);backdrop-filter:blur(18px)}
          .vc-ol-mini{background:transparent!important;backdrop-filter:none!important;pointer-events:none}
          .vc-ring{background:#fff;border-radius:1.5rem;padding:2.5rem 2rem;width:340px;max-width:92vw;box-shadow:0 30px 60px rgba(0,0,0,.45)}
          .vc-vid-dot{position:absolute;bottom:2px;right:2px;background:#22c55e;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:3px solid #fff}
          .vc-cir{width:70px;height:70px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer}
          .vc-pulse{animation:vcPulse 1.4s ease-in-out infinite}
          @keyframes vcPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
          .vc-win{border-radius:1.5rem;overflow:hidden}
          .vc-win-l{width:95vw;height:92vh;box-shadow:0 30px 80px rgba(0,0,0,.7)}
          .vc-win-s{position:fixed;bottom:1.5rem;right:1.5rem;width:220px;height:310px;border-radius:1.25rem;pointer-events:auto;box-shadow:0 10px 40px rgba(0,0,0,.5)}
          @media(max-width:768px){.vc-win-l{width:100vw;height:100vh;border-radius:0}.vc-pip{width:100px!important;height:140px!important;bottom:5.5rem!important;right:.75rem!important}}
          .vc-waiting{position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.55)}
          .vc-pip{position:absolute;bottom:4rem;right:1.5rem;width:150px;height:110px;border-radius:.75rem;overflow:hidden;border:2px solid rgba(255,255,255,.25);z-index:20;background:#1e293b;box-shadow:0 4px 20px rgba(0,0,0,.5)}
          .vc-ctrl{position:absolute;bottom:2rem;left:50%;transform:translateX(-50%);z-index:30}
          .vc-ctrl-s{bottom:.5rem;transform:translateX(-50%) scale(.7)}
          .vc-bar{display:flex;align-items:center;gap:.75rem;background:rgba(0,0,0,.55);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.12);border-radius:9999px;padding:.6rem 1.2rem}
          .vc-b{width:52px;height:52px;border-radius:50%;border:none;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.15);color:#fff;cursor:pointer;transition:background .15s}
          .vc-b:hover{background:rgba(255,255,255,.25)}
          .vc-b-r{background:#ef4444!important}.vc-b-r:hover{background:#dc2626!important}
          .vc-b-end{width:62px;height:62px;background:#ef4444!important}.vc-b-end:hover{background:#dc2626!important}
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
