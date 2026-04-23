import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { LuMessageSquare, LuPlus, LuSearch, LuArrowLeft, LuArrowRight, LuSend, LuInfo, LuHeart, LuTarget, LuZap, LuCircleCheck, LuStar, LuPaperclip, LuDownload, LuFile, LuTrash2, LuVideo } from 'react-icons/lu';
import VideoCallOverlay from '../components/VideoCallOverlay';

export default function MessagesPage() {
  const { user } = useAuth();
  const { conversationId: urlConvId } = useParams();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [peers, setPeers] = useState([]);
  const [connections, setConnections] = useState([]);
  const [completingSwap, setCompletingSwap] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingConn, setRatingConn] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const fileInputRef = useRef(null);
  const messageIdsRef = useRef(new Set());

  const makeConvId = useCallback((a, b) => [String(a), String(b)].sort().join('_'), []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const [convRes, connRes] = await Promise.all([
        api.get('/messages/conversations'),
        api.get('/connections'),
      ]);
      setConversations(convRes.data.conversations || []);
      setConnections(connRes.data.connections || []);
    } catch (err) {
      console.error("Load conv failed:", err);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  }, []);

  const loadMessages = useCallback(async (convId) => {
    try {
      const res = await api.get(`/messages/${convId}`);
      const msgs = res.data.messages || [];
      setMessages(msgs);
      messageIdsRef.current = new Set(msgs.map((m) => m._id || m.id));
      scrollToBottom();
      api.put(`/messages/${convId}/read`).catch(() => { });
    } catch (err) {
      console.error("Load msgs failed:", err);
    }
  }, [scrollToBottom]);

  const loadPeers = useCallback(async () => {
    try {
      const res = await api.get('/connections/peers');
      setPeers(res.data.peers || []);
    } catch (err) {
      console.error("Load peers failed:", err);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (urlConvId && !activeConv) {
      const match = conversations.find((c) => c.id === urlConvId);
      if (match) {
        setActiveConv(match);
      } else if (urlConvId.includes('_')) {
        const parts = urlConvId.split('_');
        const peerId = parts.find((id) => id !== user?.id);
        if (peerId) {
          api.get(`/users/${peerId}`).then((res) => {
            const peer = res.data.user;
            if (peer) {
              setActiveConv({
                id: urlConvId,
                participant: peer,
                lastMessage: null,
                unreadCount: 0,
              });
            }
          }).catch(() => { });
        }
      }
    }
  }, [urlConvId, conversations, activeConv, user]);

  useEffect(() => {
    if (activeConv) {
      loadMessages(activeConv.id);
    } else {
      setMessages([]);
      messageIdsRef.current = new Set();
    }
  }, [activeConv, loadMessages]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleReceiveMessage = (msg) => {
      const msgId = msg._id || msg.id;
      const convId = msg.conversationId || msg.conversation;
      if (activeConv && convId === activeConv.id) {
        if (!messageIdsRef.current.has(msgId)) {
          messageIdsRef.current.add(msgId);
          setMessages((prev) => [...prev, msg]);
          scrollToBottom();
          if (msg.receiver?.id === user?.id || msg.receiver?._id === user?.id) {
            api.put(`/messages/${convId}/read`).catch(() => { });
          }
        }
      }
      loadConversations();
    };

    const handleTyping = () => setTyping(true);
    const handleStopTyping = () => setTyping(false);

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('newMessage', handleReceiveMessage);
    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('newMessage', handleReceiveMessage);
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
    };
  }, [activeConv, loadConversations, scrollToBottom, user]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !activeConv || sending) return;

    setSending(true);
    const content = newMsg.trim();
    setNewMsg('');

    try {
      const res = await api.post(`/messages/${activeConv.id}`, { content });
      const msg = res.data.message;
      const msgId = msg._id || msg.id;

      if (!messageIdsRef.current.has(msgId)) {
        messageIdsRef.current.add(msgId);
        setMessages((prev) => [...prev, msg]);
      }
      scrollToBottom();
      loadConversations();
    } catch {
      toast.error('Failed to send message');
      setNewMsg(content);
    } finally {
      setSending(false);
    }
  };

  const handleTypingChange = (e) => {
    setNewMsg(e.target.value);
    const socket = getSocket();
    if (socket && activeConv) {
      socket.emit('typing', { receiver: activeConv.participant?.id || activeConv.participant?._id, sender: user?.id });
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(
        () => socket.emit('stopTyping', { receiver: activeConv.participant?.id || activeConv.participant?._id }),
        1500
      );
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeConv) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('content', ''); // optional text

    setUploading(true);
    try {
      const res = await api.post(`/messages/${activeConv.id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const msg = res.data.message;
      const msgId = msg._id || msg.id;

      if (!messageIdsRef.current.has(msgId)) {
        messageIdsRef.current.add(msgId);
        setMessages((prev) => [...prev, msg]);
      }
      scrollToBottom();
      loadConversations();
      toast.success('File shared!');
    } catch (err) {
      console.error('File upload failed:', err);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const completeSwapFromChat = async () => {
    if (!activeConv) return;
    const peerId = activeConv.participant?.id || activeConv.participant?._id;
    const myId = user?.id || user?._id;
    const conn = connections.find(c => {
      const reqId = c.requester?.id || c.requester?._id;
      const recId = c.recipient?.id || c.recipient?._id;
      return (reqId === myId || reqId === peerId) && (recId === myId || recId === peerId);
    });
    if (!conn) { toast.error('No accepted connection found with this user'); return; }
    setCompletingSwap(true);
    try {
      const res = await api.put(`/connections/${conn._id || conn.id}/complete`);
      toast.success(res.data.message);
      await loadConversations();
      // If both users confirmed → swap is fully done → open rating modal
      if (res.data.swapCompletedBy?.length >= 2) {
        const updatedConn = res.data.connection;
        // Check if user hasn't reviewed yet
        const hasReviewed = (updatedConn?.reviews || []).some(
          r => (r.reviewer?.id || r.reviewer?._id || r.reviewer?.toString()) === myId
        );
        if (!hasReviewed) {
          setRatingConn(updatedConn);
          setRatingValue(5);
          setRatingComment('');
          setShowRatingModal(true);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete swap');
    } finally {
      setCompletingSwap(false);
    }
  };

  const submitRating = async () => {
    if (!ratingConn) return;
    setSubmittingRating(true);
    try {
      await api.post(`/connections/${ratingConn._id || ratingConn.id}/review`, {
        rating: ratingValue,
        comment: ratingComment,
      });
      toast.success('Rating submitted! Thank you.');
      setShowRatingModal(false);
      setRatingConn(null);
      loadConversations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const startNewConversation = (peer) => {
    const convId = makeConvId(user.id, peer.id || peer._id);
    const existingConv = conversations.find((c) => c.id === convId);
    if (existingConv) {
      setActiveConv(existingConv);
    } else {
      setActiveConv({
        id: convId,
        participant: peer,
        lastMessage: null,
        unreadCount: 0,
      });
    }
    setShowNewChat(false);
  };

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: '60vh' }}>
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="text-primary mb-3"
        >
          <LuZap size={40} />
        </motion.div>
        <p className="text-muted fw-medium">Loading conversations...</p>
      </div>
    );
  }

  return (
    <div className="pb-4 h-100 overflow-hidden">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="fw-bold mb-1">Messages</h1>
          <p className="text-secondary mb-0">Direct channel to your swap partners.</p>
        </div>
        <button
          onClick={() => { setShowNewChat(true); loadPeers(); }}
          className="btn btn-premium btn-premium-primary text-white shadow-lg d-flex align-items-center gap-2"
        >
          <LuPlus size={20} /><span>Start Chat</span>
        </button>
      </div>

      <div className="glass-card border-0 bg-white shadow-xl overflow-hidden d-flex" style={{ height: 'calc(100vh - 240px)', minHeight: '550px' }}>
        <div className="row g-0 w-100 h-100">
          {/* Conversation List Sidebar */}
          <div className={`col-md-4 col-xl-3 border-end h-100 d-flex flex-column bg-light-subtle ${activeConv ? 'd-none d-md-flex' : 'd-flex'}`}>
            <div className="p-4 border-bottom bg-white">
              <div className="position-relative">
                <LuSearch className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={18} />
                <input
                  type="text"
                  className="form-control form-control-lg border-0 bg-light rounded-pill ps-5 fs-6"
                  placeholder="Search Inbox..."
                />
              </div>
            </div>
            <div className="overflow-auto flex-grow-1">
              <AnimatePresence mode="popLayout">
                {conversations.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 text-center text-muted">
                    <p className="small fw-semibold">No discussions started.</p>
                  </motion.div>
                ) : (
                  <div className="list-group list-group-flush">
                    {conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => setActiveConv(conv)}
                        className={`list-group-item list-group-item-action p-4 border-0 d-flex align-items-center gap-3 transition-all ${activeConv?.id === conv.id ? 'bg-primary-light border-end border-4 border-primary' : 'bg-transparent'}`}
                      >
                        <div className="position-relative">
                          <img
                            src={conv.participant?.avatar || "/default-avatar.png"}
                            width="52" height="52" className="rounded-circle object-cover border-2 border-white shadow-sm"
                            alt=""
                          />
                          {conv.unreadCount > 0 && (
                            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-primary border border-2 border-white">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="flex-grow-1 overflow-hidden">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <h6 className={`mb-0 text-truncate ${conv.unreadCount > 0 ? 'fw-bold text-dark' : 'fw-semibold text-secondary'}`}>
                              {conv.participant?.name}
                            </h6>
                            <small className="text-muted smaller fw-medium">
                              {conv.lastMessageAt && formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false })}
                            </small>
                          </div>
                          <p className={`small mb-0 text-truncate ${conv.unreadCount > 0 ? 'fw-semibold text-dark' : 'text-muted'}`}>
                            {conv.lastMessage?.content || 'Started a conversation'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Active Chat Section */}
          <div className={`col-md-8 col-xl-9 h-100 d-flex flex-column bg-white ${!activeConv ? 'd-none d-md-flex' : 'd-flex'}`}>
            {!activeConv ? (
              <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center p-5">
                <div className="bg-primary-light text-primary rounded-circle p-4 mb-4 shadow-sm" style={{ width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LuMessageSquare size={48} />
                </div>
                <h3 className="fw-bold text-dark mb-2">Your Conversations</h3>
                <p className="text-secondary mx-auto" style={{ maxWidth: '380px' }}>
                  Select a peer to discuss your skill swap. High quality communication leads to better learning outcomes.
                </p>
              </div>
            ) : (
              <motion.div
                key={activeConv.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-100 d-flex flex-column"
              >
                {/* Chat Header */}
                <div className="p-3 p-md-4 border-bottom d-flex align-items-center gap-2 gap-md-3 bg-white shadow-sm position-relative z-1">
                  <button onClick={() => setActiveConv(null)} className="btn btn-light rounded-circle p-2 d-md-none border shadow-none flex-shrink-0">
                    <LuArrowLeft size={18} />
                  </button>
                  <img src={activeConv.participant?.avatar || "/default-avatar.png"} width="40" height="40" className="rounded-circle object-cover border d-none d-sm-block flex-shrink-0" alt="" />
                  <div className="flex-grow-1 overflow-hidden">
                    <Link to={`/users/${activeConv.participant?.id || activeConv.participant?._id}`} className="text-decoration-none">
                      <h5 className="mb-0 fw-bold text-dark hover-primary cursor-pointer fs-6 text-truncate pe-2">{activeConv.participant?.name}</h5>
                    </Link>
                    <div className="d-flex align-items-center gap-2">
                      <div className="bg-success rounded-circle flex-shrink-0" style={{ width: '6px', height: '6px' }}></div>
                      <small className={typing ? "text-primary fw-bold text-truncate" : "text-muted fw-semibold smaller text-truncate"}>
                        {typing ? "is typing..." : "Online"}
                      </small>
                    </div>
                  </div>
                  
                  <div className="d-flex align-items-center gap-1 gap-sm-2">
                    <button
                      onClick={async () => {
                        // Notify the chat that a call is being started
                        try {
                          await api.post(`/messages/${activeConv.id}`, { content: "📞 Video call started..." });
                          loadConversations();
                        } catch (err) {}
                        
                        window.dispatchEvent(new CustomEvent('trigger-call', { detail: activeConv }));
                      }}
                      className="btn btn-light border bg-white text-primary p-2 p-sm-2 rounded-circle rounded-sm-pill d-flex align-items-center justify-content-center gap-2 shadow-none"
                      title="Video Call"
                    >
                      <LuVideo size={18} /> <span className="d-none d-lg-inline small fw-bold">Video Call</span>
                    </button>

                    {(() => {
                      const myId = String(user?.id || user?._id || '');
                      const peerId = String(activeConv.participant?.id || activeConv.participant?._id || '');

                      const conn = connections.find(c => {
                        const reqId = String(c.requester?.id || c.requester?._id || '');
                        const recId = String(c.recipient?.id || c.recipient?._id || '');
                        return (
                          (reqId === myId && recId === peerId) ||
                          (reqId === peerId && recId === myId)
                        );
                      });

                      if (!conn) return null;

                      const swapDone = conn.status === 'completed';
                      const alreadyMarked = (conn.swapCompletedBy || []).map(id => String(id));
                      const iMarked = alreadyMarked.includes(myId);

                      if (swapDone) return (
                        <span className="badge bg-success-light text-success px-2 py-2 rounded-pill d-flex align-items-center gap-1 fw-bold border border-success-subtle">
                          <LuCircleCheck size={14} /> <span className="d-none d-sm-inline">Done</span>
                        </span>
                      );

                      if (iMarked) return (
                        <span className="badge bg-warning-light text-warning-emphasis px-2 py-2 rounded-pill d-flex align-items-center gap-1 fw-bold border border-warning-subtle">
                           <span className="d-none d-sm-inline small">Wait...</span> ⏳
                        </span>
                      );

                      return (
                        <button
                          onClick={completeSwapFromChat}
                          disabled={completingSwap}
                          className="btn btn-premium btn-premium-primary text-white border-0 d-flex align-items-center justify-content-center gap-1 fw-semibold rounded-pill px-2 py-2"
                          style={{ minWidth: '40px' }}
                          title="Complete Swap"
                        >
                          {completingSwap
                            ? <span className="spinner-border spinner-border-sm"></span>
                            : <LuCircleCheck size={18} />}
                          <span className="d-none d-md-inline small">Complete</span>
                        </button>
                      );
                    })()}
                  </div>
                </div>

                {/* Message Stream */}
                <div className="flex-grow-1 overflow-auto p-3 p-md-5 bg-light-subtle d-flex flex-column gap-3 gap-md-4 scroll-smooth scroll-hide" style={{ overflowX: 'hidden' }}>
                  {messages.length === 0 && (
                    <div className="text-center py-5 text-muted">
                      <LuHeart size={40} className="mb-3 opacity-25 text-primary" />
                      <p className="fw-semibold">Send a message to break the ice!</p>
                    </div>
                  )}
                  <AnimatePresence>
                    {messages.map((msg, i) => {
                      const senderId = msg.sender?._id || msg.sender?.id;
                      const isMe = senderId === user?.id || senderId === user?._id;
                      return (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          key={msg._id || msg.id || i}
                          className={`d-flex ${isMe ? 'justify-content-end' : 'justify-content-start'} w-100`}
                        >
                          <div className={`d-flex gap-2 gap-md-3 ${isMe ? 'flex-row-reverse' : ''}`} style={{ maxWidth: '90%' }}>
                            {!isMe && (
                              <img src={msg.sender?.avatar || "/default-avatar.png"} width="32" height="32" className="rounded-circle mt-auto border" alt="" />
                            )}
                             <div className={`d-flex flex-column ${isMe ? 'align-items-end' : 'align-items-start'} overflow-hidden`}>
                              <div className={`p-2 p-md-3 px-md-4 rounded-2xl shadow-sm ${isMe ? 'bg-primary text-white' : 'bg-white text-dark border'}`}>
                                {msg.fileUrl && (
                                  <div className="mb-2 w-100" style={{ minWidth: '200px' }}>
                                    {msg.fileType?.startsWith('image/') ? (
                                      <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="d-block overflow-hidden rounded shadow-sm hover:opacity-90 transition-opacity">
                                        <img src={msg.fileUrl} alt={msg.fileName} className="img-fluid rounded w-100" style={{ maxHeight: '250px', objectFit: 'cover' }} />
                                      </a>
                                    ) : (
                                      <div className={`p-2 p-md-3 rounded border d-flex align-items-center gap-2 gap-md-3 ${isMe ? 'bg-primary-dark border-primary-light' : 'bg-light'}`}>
                                        <div className={`p-2 rounded-circle flex-shrink-0 ${isMe ? 'bg-white text-primary' : 'bg-primary-light text-primary'}`}>
                                          <LuFile size={18} />
                                        </div>
                                        <div className="overflow-hidden flex-grow-1">
                                          <p className="mb-0 fw-bold text-truncate small" title={msg.fileName}>{msg.fileName}</p>
                                          <p className="mb-0 smaller opacity-75">{(msg.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                        <a href={msg.fileUrl} download={msg.fileName} className={`btn btn-sm rounded-circle p-2 flex-shrink-0 ${isMe ? 'btn-light text-primary' : 'btn-primary text-white'}`}>
                                          <LuDownload size={14} />
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {msg.content && (
                                  <div>
                                    <p className="mb-0 fs-6 leading-relaxed" style={{ wordBreak: 'break-word' }}>{msg.content}</p>
                                    {!isMe && msg.content === "📞 Video call started..." && (
                                      <button 
                                        onClick={() => window.dispatchEvent(new CustomEvent('trigger-call', { detail: activeConv }))}
                                        className="btn btn-sm btn-success rounded-pill mt-2 px-3 fw-bold d-flex align-items-center gap-1 shadow-sm"
                                      >
                                        <LuVideo size={14} /> Join Now
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                              <small className="smaller opacity-50 fw-bold mt-1 text-uppercase tracking-tighter" style={{ fontSize: '0.6rem' }}>
                                {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true }) : 'Just now'}
                              </small>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  <div ref={bottomRef} />
                </div>

                {/* Composition Area */}
                <div className="p-4 border-top bg-white">
                  <form onSubmit={handleSend} className="input-group gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="d-none"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || sending}
                      className="btn btn-light rounded-circle shadow-sm d-flex align-items-center justify-content-center border"
                      style={{ width: '52px', height: '52px' }}
                      title="Attach a file"
                    >
                      {uploading ? <span className="spinner-border spinner-border-sm text-primary"></span> : <LuPaperclip size={24} className="text-secondary" />}
                    </button>
                    <input
                      type="text"
                      className="form-control form-control-lg border-0 bg-light rounded-pill px-4 fs-6"
                      placeholder={uploading ? "Uploading file..." : "Type your message here..."}
                      value={newMsg}
                      onChange={handleTypingChange}
                      disabled={sending || uploading}
                    />
                    <button
                      type="submit"
                      className="btn btn-premium btn-premium-primary text-white rounded-circle p-0 d-flex align-items-center justify-content-center shadow-lg flex-shrink-0"
                      style={{ width: '48px', height: '48px' }}
                      disabled={(!newMsg.trim() && !uploading) || sending || uploading}
                    >
                      {sending ? <span className="spinner-border spinner-border-sm"></span> : <LuSend size={22} />}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Modern Modal for New Chat */}
      <AnimatePresence>
        {showNewChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal fade show d-block"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="modal-content border-0 shadow-2xl rounded-3xl overflow-hidden"
              >
                <div className="modal-header border-0 bg-white p-4">
                  <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                    <LuMessageSquare className="text-primary" /> Start New Swap Chat
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowNewChat(false)}></button>
                </div>
                <div className="modal-body p-0" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {peers.length === 0 ? (
                    <div className="p-5 text-center">
                      <p className="text-secondary mb-4">You need active connections to start a direct message.</p>
                      <Link to="/matches" onClick={() => setShowNewChat(false)} className="btn btn-premium btn-premium-primary text-white">Find People to Connect</Link>
                    </div>
                  ) : (
                    <div className="list-group list-group-flush">
                      {peers.map((peer) => (
                        <button
                          key={peer.id || peer._id}
                          onClick={() => startNewConversation(peer)}
                          className="list-group-item list-group-item-action d-flex align-items-center gap-4 p-4 border-0 hover:bg-light transition-all"
                        >
                          <img src={peer.avatar || "/default-avatar.png"} width="48" height="48" className="rounded-circle object-cover border" alt="" />
                          <div className="flex-grow-1 overflow-hidden">
                            <h6 className="mb-0 fw-bold text-dark">{peer.name}</h6>
                            <small className="text-muted text-truncate d-block fw-medium">{peer.bio || 'Wants to swap expertise'}</small>
                          </div>
                          <LuArrowRight className="text-primary opacity-0 transition-all" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ── Rating Modal ── */}
      <AnimatePresence>
        {showRatingModal && ratingConn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal fade show d-block"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(10px)', zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <motion.div
                initial={{ scale: 0.88, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.88, y: 30 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="modal-content border-0 shadow-2xl overflow-hidden"
                style={{ borderRadius: '20px' }}
              >
                {/* Header */}
                <div
                  className="p-4 text-white text-center position-relative"
                  style={{ background: 'linear-gradient(135deg, #2563EB 0%, #10B981 100%)' }}
                >
                  <div className="d-flex justify-content-center mb-2">
                    <div className="bg-white bg-opacity-25 rounded-circle p-3">
                      <LuCircleCheck size={32} />
                    </div>
                  </div>
                  <h5 className="fw-bold mb-1">Swap Completed! 🎉</h5>
                  <p className="small opacity-90 mb-0">
                    Rate your experience with <strong>{activeConv?.participant?.name}</strong>
                  </p>
                  <button
                    type="button"
                    className="btn-close btn-close-white position-absolute top-0 end-0 m-3"
                    onClick={() => setShowRatingModal(false)}
                  />
                </div>

                {/* Body */}
                <div className="modal-body p-4">
                  {/* Star picker */}
                  <div className="text-center mb-4">
                    <p className="text-secondary small fw-semibold mb-3">How was your skill-swap experience?</p>
                    <div className="d-flex justify-content-center gap-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatingValue(star)}
                          className="btn p-0 border-0 bg-transparent"
                          style={{ fontSize: '2rem', lineHeight: 1, transition: 'transform 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
                          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                        >
                          <span style={{ color: star <= ratingValue ? '#F59E0B' : '#D1D5DB' }}>★</span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-muted small fw-bold">
                      {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][ratingValue]}
                    </p>
                  </div>

                  {/* Comment */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold text-dark small">Leave a comment (optional)</label>
                    <textarea
                      className="form-control border-0 bg-light rounded-3"
                      rows={3}
                      placeholder={`Share what you learned from ${activeConv?.participant?.name}...`}
                      value={ratingComment}
                      onChange={e => setRatingComment(e.target.value)}
                      style={{ resize: 'none' }}
                    />
                  </div>

                  {/* Actions */}
                  <div className="d-flex gap-3">
                    <button
                      type="button"
                      className="btn btn-light border rounded-pill flex-grow-1 fw-semibold"
                      onClick={() => setShowRatingModal(false)}
                    >
                      Skip for Now
                    </button>
                    <button
                      type="button"
                      onClick={submitRating}
                      disabled={submittingRating}
                      className="btn btn-premium btn-premium-primary text-white rounded-pill flex-grow-1 fw-bold d-flex align-items-center justify-content-center gap-2"
                    >
                      {submittingRating
                        ? <span className="spinner-border spinner-border-sm" />
                        : <LuStar size={16} />}
                      Submit Rating
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
