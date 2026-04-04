import {
  ImagePlus,
  MessageCircle,
  Mic,
  Search,
  SendHorizontal,
  Smile,
  Sticker,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import * as chatService from '../services/chatService';
import {
  emitStopTyping,
  emitTyping,
  initChatSocket,
  joinRoom,
  leaveRoom,
  removeChatSocketCallbacks,
} from '../socket/chatSocket';
import {
  appendMessage,
  markConversationRead,
  removeMessage,
  setActiveConversation,
  setConversations,
  setHasMore,
  setIsLoadingConversations,
  setIsLoadingMessages,
  setMessages,
  setPage,
  setTypingUser,
  setUnreadCount,
  updateLastMessage,
} from '../store/chatSlice';

const PAGE_LIMIT = 20;

const getUserId = (user) => user?._id || user?.id || '';
const getUserName = (user) => user?.full_name || user?.name || user?.username || 'User';
const getUserAvatar = (user) => user?.avatar_url || user?.profilePicture || user?.profile_picture || '';
const getInitial = (user) => getUserName(user).trim().charAt(0).toUpperCase() || 'U';
const isVideoUrl = (url = '') => /\.(mp4|mov|webm|ogg|m4v)$/i.test(url) || url.includes('.m3u8');

const formatAgo = (dateValue) => {
  if (!dateValue) return '';
  const diff = Date.now() - new Date(dateValue).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateValue).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const formatSeenAgo = (dateValue) => {
  if (!dateValue) return 'Seen';
  const diff = Date.now() - new Date(dateValue).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `Seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Seen ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Seen ${days}d ago`;
  return `Seen ${new Date(dateValue).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
};

const formatSeparator = (dateValue) =>
  new Date(dateValue).toLocaleString('en-IN', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

const otherParticipant = (conversation, currentUserId) =>
  conversation?.participants?.find((item) => String(item?._id) !== String(currentUserId))
  || conversation?.participants?.[0]
  || null;

const sortConversations = (conversations) =>
  [...conversations].sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));

const previousNonDeleted = (messages) => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (!messages[index]?.isDeleted) return messages[index];
  }
  return null;
};

const hasUserSeenMessage = (message, userId) =>
  (message?.seenBy || []).some((entry) => String(entry?._id || entry) === String(userId));

const messagePreview = (message, isMine, name) => {
  if (!message) return 'Start chatting';
  if (message.isDeleted) return 'Message unsent';
  if (message.text) return isMine ? `You: ${message.text}` : message.text;
  if (message.mediaUrl) return isMine ? 'You sent an attachment.' : `${name} sent an attachment.`;
  return 'Start chatting';
};

const Avatar = ({ user, className = 'h-10 w-10' }) => {
  const avatar = getUserAvatar(user);
  if (avatar) {
    return <img src={avatar} alt={getUserName(user)} className={`${className} rounded-full object-cover`} />;
  }

  return (
    <div className={`${className} flex items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] text-sm font-bold text-white`}>
      {getInitial(user)}
    </div>
  );
};

const TypingIndicator = () => (
  <div className="mb-3 flex items-end gap-2">
    <div className="w-7 h-7 flex-shrink-0" />
    <div
      className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-[#262626] px-4 py-3"
      style={{ minWidth: '60px' }}
    >
      <span className="typing-dot" style={{ animationDelay: '0ms' }} />
      <span className="typing-dot" style={{ animationDelay: '200ms' }} />
      <span className="typing-dot" style={{ animationDelay: '400ms' }} />
    </div>
  </div>
);

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

const ReactionPicker = ({ onSelect, mine }) => (
  <div
    className={`absolute ${mine ? 'right-0' : 'left-0'} -top-10 z-50 
                  flex gap-1 rounded-full bg-[#1a1a1a] border border-white/10 
                  px-2 py-1.5 shadow-xl`}
    onClick={(e) => e.stopPropagation()}
  >
    {REACTION_EMOJIS.map((emoji) => (
      <button
        key={emoji}
        onClick={() => onSelect(emoji)}
        className="text-base transition-transform hover:scale-125 
                     active:scale-95 leading-none"
      >
        {emoji}
      </button>
    ))}
  </div>
);

const MessageActions = ({ message, mine, onReply, onReact, onMore }) => (
  <div
    className={`flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 
                  transition-opacity duration-150 flex-shrink-0
                  ${mine ? 'flex-row' : 'flex-row-reverse'}`}
    onClick={(e) => e.stopPropagation()}
  >
    <button
      onClick={(e) => onMore(e, message)}
      className="rounded-full p-1.5 text-gray-500 hover:text-white 
                   hover:bg-white/10 transition-colors"
      title="More"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="5" cy="12" r="2"/>
        <circle cx="12" cy="12" r="2"/>
        <circle cx="19" cy="12" r="2"/>
      </svg>
    </button>
    <button
      onClick={() => onReply(message)}
      className="rounded-full p-1.5 text-gray-500 hover:text-white 
                   hover:bg-white/10 transition-colors"
      title="Reply"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" 
             stroke="currentColor" strokeWidth="2" strokeLinecap="round" 
             strokeLinejoin="round">
        <polyline points="9 17 4 12 9 7"/>
        <path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
      </svg>
    </button>
    <button
      onClick={() => onReact(message)}
      className="rounded-full p-1.5 text-gray-500 hover:text-white 
                   hover:bg-white/10 transition-colors"
      title="React"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" 
             stroke="currentColor" strokeWidth="2" strokeLinecap="round" 
             strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M8 13s1.5 2 4 2 4-2 4-2"/>
        <line x1="9" y1="9" x2="9.01" y2="9"/>
        <line x1="15" y1="9" x2="15.01" y2="9"/>
      </svg>
    </button>
  </div>
);

export default function ChatPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { conversationId: conversationIdFromUrl } = useParams();
  const fileInputRef = useRef(null);
  const scrollerRef = useRef(null);
  const stopTypingRef = useRef(null);
  const roomRef = useRef(null);
  const contextRef = useRef(null);
  const longPressRef = useRef(null);
  const activeConversationIdRef = useRef(null);
  const chatPageCallbacksRef = useRef(null);
  const onNewMessageRef = useRef(null);
  const onMessageRemovedRef = useRef(null);
  const messagesRef = useRef([]);
  const unreadCountsRef = useRef({});
  const currentUserIdRef = useRef('');

  const [search, setSearch] = useState('');
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [reactions, setReactions] = useState({});
  const [reactionPickerFor, setReactionPickerFor] = useState(null);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);

  const {
    conversations,
    activeConversation,
    messages,
    page,
    hasMore,
    isLoadingConversations,
    isLoadingMessages,
    typingUsers,
    unreadCounts,
  } = useSelector((state) => state.chat);
  const { userObject } = useSelector((state) => state.auth);

  const currentUserId = getUserId(userObject);
  const token = localStorage.getItem('token');
  const activeId = activeConversation?._id || conversationIdFromUrl || null;
  const otherUser = useMemo(() => otherParticipant(activeConversation, currentUserId), [activeConversation, currentUserId]);
  const activeTyping = (typingUsers[activeId] || []).filter((id) => String(id) !== String(currentUserId));
  const otherUserId = getUserId(otherUser);

  useEffect(() => {
    activeConversationIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    unreadCountsRef.current = unreadCounts;
  }, [unreadCounts]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) => {
      const other = otherParticipant(conversation, currentUserId);
      return [getUserName(other), other?.username].filter(Boolean).some((value) => value.toLowerCase().includes(query));
    });
  }, [conversations, currentUserId, search]);

  const groupedMessages = useMemo(() => {
    const result = [];
    let lastLabel = '';
    messages.forEach((message, index) => {
      const label = formatSeparator(message.createdAt);
      if (label !== lastLabel) {
        result.push({ type: 'separator', id: `sep-${label}-${index}`, label });
        lastLabel = label;
      }
      result.push({ type: 'message', message });
    });
    return result;
  }, [messages]);

  const setConversationAsActive = useCallback(async (conversation, options = {}) => {
    if (!conversation?._id || !currentUserId) return;
    const { skipNavigation = false } = options;

    dispatch(setActiveConversation(conversation));
    dispatch(markConversationRead(conversation._id));
    dispatch(setMessages([]));
    dispatch(setPage(1));
    dispatch(setHasMore(true));
    dispatch(setIsLoadingMessages(true));

    if (!skipNavigation) navigate(`/messages/${conversation._id}`);

    try {
      const response = await chatService.getMessages(conversation._id, 1, PAGE_LIMIT);
      dispatch(setMessages([...(response?.messages || [])].reverse()));
      dispatch(setHasMore(Boolean(response?.hasMore)));
      dispatch(setPage(1));
      dispatch(markConversationRead(conversation._id));
    } catch (error) {
      console.error('Failed to load messages:', error);
      dispatch(setMessages([]));
      dispatch(setHasMore(false));
    } finally {
      dispatch(setIsLoadingMessages(false));
    }
  }, [currentUserId, dispatch, navigate]);

  const fetchConversations = useCallback(async () => {
    dispatch(setIsLoadingConversations(true));
    try {
      const data = await chatService.getConversations();
      const ordered = sortConversations(data || []);
      dispatch(setConversations(ordered));
      return ordered;
    } catch (error) {
      console.error('Failed to load conversations:', error);
      dispatch(setConversations([]));
      return [];
    } finally {
      dispatch(setIsLoadingConversations(false));
    }
  }, [dispatch]);

  const markLatestSeen = useCallback(async (items = messages, conversation = activeConversation) => {
    if (!conversation?._id || !currentUserId) return;
    const latest = [...items].reverse().find((message) => (
      !message.isDeleted
      && String(message?.sender?._id || message?.sender) !== String(currentUserId)
      && !(message.seenBy || []).some((id) => String(id?._id || id) === String(currentUserId))
    ));
    if (!latest?._id) return;

    try {
      const updatedMessage = await chatService.markMessageSeen(latest._id);
      const nextMessages = items.map((message) => (message._id === latest._id ? { ...message, ...updatedMessage } : message));
      messagesRef.current = nextMessages;
      dispatch(setMessages(nextMessages));
    } catch (error) {
      console.error('Failed to mark seen:', error);
    }
  }, [activeConversation, currentUserId, dispatch, messages]);

  const refreshConversationOrdering = useCallback((conversationId, lastMessage, lastMessageAt) => {
    dispatch(updateLastMessage({ conversationId, lastMessage, lastMessageAt }));
  }, [dispatch]);

  const onNewMessage = useCallback(async (message) => {
    const incomingConversationId = String(
      message?.conversationId?._id
      || message?.conversationId?.id
      || message?.conversationId
      || ''
    );
    if (!incomingConversationId) return;

    refreshConversationOrdering(
      incomingConversationId,
      message,
      message.createdAt || new Date().toISOString()
    );

    const currentActiveConversationId = String(
      roomRef.current
      || activeConversationIdRef.current
      || conversationIdFromUrl
      || ''
    );

    if (currentActiveConversationId === incomingConversationId) {
      const existingMessages = messagesRef.current || [];
      const nextMessages = existingMessages.some((item) => item._id === message._id)
        ? existingMessages.map((item) => (item._id === message._id ? { ...item, ...message } : item))
        : [...existingMessages, message];

      messagesRef.current = nextMessages;
      dispatch(setMessages(nextMessages));
      dispatch(markConversationRead(incomingConversationId));

      if (String(message?.sender?._id || message?.sender || message?.senderId) !== String(currentUserIdRef.current)) {
        try {
          const updatedMessage = await chatService.markMessageSeen(message._id);
          const seenMessages = messagesRef.current.map((item) => (
            item._id === message._id ? { ...item, ...updatedMessage } : item
          ));
          messagesRef.current = seenMessages;
          dispatch(setMessages(seenMessages));
        } catch (error) {
          console.error('Failed to auto-mark seen:', error);
        }
      }
      return;
    }

    dispatch(setUnreadCount({
      conversationId: incomingConversationId,
      count: (unreadCountsRef.current[incomingConversationId] || 0) + 1,
    }));
  }, [dispatch, refreshConversationOrdering]);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  const onMessageRemoved = useCallback(({ conversationId, messageId }) => {
    const deletedAt = new Date().toISOString();
    dispatch(removeMessage({ messageId, deletedAt }));

    if (!messagesRef.current.some((item) => item._id === messageId)) return;

    const nextMessages = messagesRef.current.map((item) => (
      item._id === messageId ? { ...item, isDeleted: true, deletedAt: new Date().toISOString() } : item
    ));
    messagesRef.current = nextMessages;
    dispatch(setMessages(nextMessages));

    if (String(activeConversationIdRef.current || '') !== String(conversationId || '')) return;
    const lastVisible = previousNonDeleted(nextMessages);
    refreshConversationOrdering(conversationId, lastVisible, lastVisible?.createdAt || activeConversation?.createdAt);
  }, [activeConversation?.createdAt, dispatch, refreshConversationOrdering]);

  useEffect(() => {
    onMessageRemovedRef.current = onMessageRemoved;
  }, [onMessageRemoved]);

  useEffect(() => {
    if (!token) return undefined;

    const callbacks = {
      onNewMessage: (...args) => onNewMessageRef.current?.(...args),
      onUserTyping: ({ conversationId, userId: typingUserId }) =>
        dispatch(setTypingUser({ conversationId, userId: typingUserId, isTyping: true })),
      onUserStopTyping: ({ conversationId, userId: typingUserId }) =>
        dispatch(setTypingUser({ conversationId, userId: typingUserId, isTyping: false })),
      onMessageSeenUpdate: ({ conversationId, messageId, userId: seenUserId, seenAt }) => {
        if (!messagesRef.current.some((m) => m._id === messageId)) return;
        const nextMessages = messagesRef.current.map((m) =>
          m._id === messageId
            ? {
                ...m,
                seenBy: Array.from(new Set([...(m.seenBy || []), seenUserId])),
                seenAt: seenAt || m.seenAt,
              }
            : m
        );
        messagesRef.current = nextMessages;
        dispatch(setMessages(nextMessages));
      },
      onMessageRemoved: (...args) => onMessageRemovedRef.current?.(...args),
    };

    chatPageCallbacksRef.current = callbacks;
    initChatSocket(token, callbacks, currentUserId);

    return () => {
      if (roomRef.current) leaveRoom(roomRef.current);
      roomRef.current = null;
      if (chatPageCallbacksRef.current) {
        removeChatSocketCallbacks(chatPageCallbacksRef.current);
      }
    };
  }, [currentUserId, dispatch, token]);

  useEffect(() => {
    if (!activeId) return undefined;

    if (roomRef.current && roomRef.current !== activeId) {
      leaveRoom(roomRef.current);
    }

    roomRef.current = activeId;
    joinRoom(activeId);

    return () => {
      if (roomRef.current === activeId) {
        leaveRoom(activeId);
        roomRef.current = null;
      }
    };
  }, [activeId]);

  useEffect(() => {
    fetchConversations().then((loaded) => {
      if (!conversationIdFromUrl) {
        dispatch(setActiveConversation(null));
        return;
      }
      const conversation = loaded.find((item) => item._id === conversationIdFromUrl);
      if (conversation) setConversationAsActive(conversation, { skipNavigation: true });
    });
  }, [conversationIdFromUrl, dispatch, fetchConversations, setConversationAsActive]);

  useEffect(() => {
    if (!conversationIdFromUrl || activeConversation?._id === conversationIdFromUrl) return;
    const conversation = conversations.find((item) => item._id === conversationIdFromUrl);
    if (conversation) setConversationAsActive(conversation, { skipNavigation: true });
  }, [activeConversation?._id, conversationIdFromUrl, conversations, setConversationAsActive]);

  useEffect(() => {
    if (!scrollerRef.current || !activeId) return;
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [activeId, messages.length, activeTyping.length]);

  useEffect(() => {
    if (messages.length && activeConversation?._id) markLatestSeen(messages, activeConversation);
  }, [activeConversation, markLatestSeen, messages]);

  useEffect(() => {
    const handler = (event) => {
      if (contextRef.current && !contextRef.current.contains(event.target)) setContextMenu(null);
    };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  useEffect(() => {
    if (!reactionPickerFor) return undefined;
    const handler = () => setReactionPickerFor(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [reactionPickerFor]);

  const stopTyping = useCallback(() => {
    if (activeConversation?._id && currentUserId) emitStopTyping(activeConversation._id, currentUserId);
  }, [activeConversation, currentUserId]);

  const scheduleStopTyping = useCallback(() => {
    clearTimeout(stopTypingRef.current);
    stopTypingRef.current = setTimeout(() => stopTyping(), 1500);
  }, [stopTyping]);

  const handleLoadMore = async () => {
    if (!activeConversation?._id || !hasMore || isLoadingMessages) return;
    dispatch(setIsLoadingMessages(true));
    try {
      const nextPage = page + 1;
      const response = await chatService.getMessages(activeConversation._id, nextPage, PAGE_LIMIT);
      dispatch(setMessages([...[...(response?.messages || [])].reverse(), ...messages]));
      dispatch(setPage(nextPage));
      dispatch(setHasMore(Boolean(response?.hasMore)));
    } catch (error) {
      console.error('Failed to load older messages:', error);
    } finally {
      dispatch(setIsLoadingMessages(false));
    }
  };

  const handleSend = async (customPayload = null) => {
    if (!activeConversation?._id || !currentUserId) return;
    if (sending) return;
    const payload = customPayload || {
      text: input.trim(),
      mediaUrl: '',
      mediaType: 'none',
      replyTo,
    };

    if (!payload.text && !payload.mediaUrl) return;

    setSending(true);
    try {
      const created = await chatService.sendMessage(activeConversation._id, payload);
      const enriched = { ...created, replyTo: payload.replyTo || null };
      dispatch(appendMessage(enriched));
      refreshConversationOrdering(activeConversation._id, enriched, enriched.createdAt);
      dispatch(markConversationRead(activeConversation._id));

      setInput('');
      setReplyTo(null);
      stopTyping();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !activeConversation?._id) return;
    setUploading(true);
    try {
      const uploaded = await chatService.uploadChatMedia(activeConversation._id, file);
      await handleSend({
        text: '',
        mediaUrl: uploaded.mediaUrl,
        mediaType: uploaded.mediaType,
        replyTo,
      });
    } catch (error) {
      console.error('Failed to upload media:', error);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (message) => {
    if (!message?._id || !activeConversation?._id) return;
    try {
      await chatService.deleteMessage(message._id);
      dispatch(removeMessage({ messageId: message._id, deletedAt: new Date().toISOString() }));
      const nextMessages = messages.map((item) => (
        item._id === message._id ? { ...item, isDeleted: true, deletedAt: new Date().toISOString() } : item
      ));
      const lastVisible = previousNonDeleted(nextMessages);
      refreshConversationOrdering(activeConversation._id, lastVisible, lastVisible?.createdAt || activeConversation.createdAt);
      setContextMenu(null);
    } catch (error) {
      console.error('Failed to unsend message:', error);
    }
  };

  const handleReply = (message) => {
    const senderName =
      String(message?.sender?._id || message?.sender) === String(currentUserId)
        ? 'You'
        : getUserName(otherUser);
    setReplyTo({
      messageId: message._id,
      text: message.text || 'Attachment',
      senderName,
      senderId: message?.sender?._id || message?.sender,
    });
    setReactionPickerFor(null);
    setContextMenu(null);
  };

  const handleReact = (message) => {
    setReactionPickerFor((prev) =>
      prev === message._id ? null : message._id
    );
  };

  const handleSelectReaction = (messageId, emoji) => {
    setReactions((prev) => ({
      ...prev,
      [messageId]: prev[messageId] === emoji ? null : emoji,
    }));
    setReactionPickerFor(null);
  };

  const handleMoreMenu = (event, message) => {
    event.preventDefault();
    setContextMenu({
      x: Math.min(event.clientX || window.innerWidth / 2 - 90, window.innerWidth - 190),
      y: Math.min(event.clientY || window.innerHeight - 150, window.innerHeight - 110),
      message,
    });
    setReactionPickerFor(null);
  };

  const openContext = (event, message) => {
    event.preventDefault();
    setReactionPickerFor(null);
    setContextMenu({
      x: Math.min(event.clientX, window.innerWidth - 190),
      y: Math.min(event.clientY, window.innerHeight - 110),
      message,
    });
  };

  const startLongPress = (message) => {
    clearTimeout(longPressRef.current);
    longPressRef.current = setTimeout(() => {
      setContextMenu({ x: window.innerWidth / 2 - 90, y: window.innerHeight - 150, message });
    }, 450);
  };

  const clearLongPress = () => clearTimeout(longPressRef.current);

  const renderBubble = (message, mine) => {
    if (message.isDeleted) {
      return <p className="text-sm italic text-gray-500">Message unsent</p>;
    }

    const bubbleClass = mine
      ? 'bg-[#7C3AED] rounded-[22px] rounded-br-md'
      : 'bg-[#262626] rounded-[22px] rounded-bl-md';

    return (
      <div className="max-w-[280px] sm:max-w-[340px]">
        {message.replyTo ? (
          <div className={`mb-1 rounded-2xl border border-white/10 px-3 py-2 text-xs ${mine ? 'bg-[#672ec3]' : 'bg-[#1a1a1a]'}`}>
            <p className="mb-1 font-semibold text-white/80">
              {String(message.replyTo.senderId) === String(currentUserId) ? 'You replied' : `${message.replyTo.senderName || 'User'} replied`}
            </p>
            <p className="line-clamp-2 text-white/70">{message.replyTo.text || 'Attachment'}</p>
          </div>
        ) : null}
        <div className={`${bubbleClass} overflow-hidden px-3 py-2.5 text-white`}>
          {message.mediaUrl ? (
            <div className="space-y-2">
              {message.mediaType === 'video' || isVideoUrl(message.mediaUrl)
                ? <video src={message.mediaUrl} controls className="max-h-80 w-full rounded-2xl object-cover outline-none border-0 [-webkit-tap-highlight-color:transparent]" />
                : <img src={message.mediaUrl} alt="attachment" className="max-h-80 w-full rounded-2xl object-cover outline-none border-0 [-webkit-tap-highlight-color:transparent]" />}
              {message.text ? <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p> : null}
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
          )}
        </div>
      </div>
    );
  };

  const latestSeenOwnMessageId = useMemo(() => {
    if (!otherUserId) return null;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      const mine = String(message?.sender?._id || message?.sender) === String(currentUserId);
      if (mine && !message?.isDeleted && hasUserSeenMessage(message, otherUserId)) {
        return message._id;
      }
    }
    return null;
  }, [currentUserId, messages, otherUserId]);

  return (
    <div className="h-[100dvh] bg-black text-white md:h-screen">
      <div className="flex h-full">
        <aside className="hidden h-full w-[380px] flex-shrink-0 border-r border-white/10 bg-[#0a0a0a] md:flex md:flex-col">
          <div className="border-b border-white/10 px-5 py-5">
            <div className="flex items-center gap-3 rounded-full bg-[#111111] px-4 py-3 text-sm text-gray-400">
              <Search size={16} className="text-gray-500" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="w-full bg-transparent outline-none placeholder:text-gray-500" />
            </div>

            <div className="mt-5 flex gap-4 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {conversations.map((conversation) => {
                const user = otherParticipant(conversation, currentUserId);
                return (
                  <button key={conversation._id} onClick={() => setConversationAsActive(conversation)} className="flex min-w-[64px] flex-col items-center gap-2">
                    <div className="rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] p-[2px]">
                      <div className="rounded-full bg-black p-[2px]">
                        <Avatar user={user} className="h-14 w-14" />
                      </div>
                    </div>
                    <span className="max-w-[64px] truncate text-[11px] text-gray-300">{user?.username || getUserName(user)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between px-5 py-4">
            <h1 className="text-xl font-semibold">Messages</h1>
            <span className="text-sm text-gray-500">Requests</span>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {isLoadingConversations ? (
              <div className="space-y-3 px-3 pt-2">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div key={index} className="flex animate-pulse items-center gap-3 rounded-2xl px-3 py-3">
                    <div className="h-12 w-12 rounded-full bg-[#1f1f1f]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/3 rounded bg-[#1f1f1f]" />
                      <div className="h-3 w-2/3 rounded bg-[#161616]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const user = otherParticipant(conversation, currentUserId);
                const mine = String(conversation?.lastMessage?.sender?._id || conversation?.lastMessage?.sender) === String(currentUserId);
                const unread = unreadCounts[conversation._id] ?? conversation.unreadCount ?? 0;
                const active = activeId === conversation._id;
                const isTyping = (typingUsers[conversation._id] || []).some((id) => String(id) !== String(currentUserId));

                return (
                  <button key={conversation._id} onClick={() => setConversationAsActive(conversation)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors ${active ? 'bg-[#1a1a1a]' : 'hover:bg-[#141414]'}`}>
                    <Avatar user={user} className="h-12 w-12" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{getUserName(user)}</p>
                        <span className="text-xs text-gray-500">{formatAgo(conversation.lastMessageAt)}</span>
                      </div>
                      <p className={`truncate text-sm ${isTyping ? 'font-medium text-[#3B82F6]' : 'text-gray-400'}`}>
                        {isTyping ? 'Typing...' : messagePreview(conversation.lastMessage, mine, getUserName(user))}
                      </p>
                      {unread > 0 ? <p className="mt-1 text-xs font-semibold text-[#3B82F6]">{unread} new message{unread > 1 ? 's' : ''}</p> : null}
                    </div>
                    {unread > 0 ? <span className="h-2.5 w-2.5 rounded-full bg-[#3B82F6]" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-black overflow-hidden">
          {!activeConversation ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/20">
                <MessageCircle size={42} />
              </div>
              <h2 className="mt-6 text-2xl font-semibold">Your messages</h2>
              <p className="mt-2 text-sm text-gray-400">Send a message to start a chat.</p>
              <button className="mt-6 rounded-full bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold transition hover:bg-[#6d28d9]">Send message</button>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                <Avatar user={otherUser} className="h-9 w-9" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{otherUser?.username || getUserName(otherUser)}</p>
                  <p className="truncate text-xs text-gray-500">{getUserName(otherUser)}</p>
                </div>
              </header>

              <div ref={scrollerRef} onScroll={(e) => { if (e.currentTarget.scrollTop <= 60) handleLoadMore(); }} className="flex-1 min-h-0 overflow-y-auto px-3 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {isLoadingMessages && messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#262626] border-t-[#7C3AED]" />
                  </div>
                ) : (
                  <div className="flex min-h-full flex-col justify-end">
                    {groupedMessages.map((item, index) => {
                      if (item.type === 'separator') {
                        return <div key={item.id} className="my-4 flex justify-center"><span className="rounded-full bg-[#111111] px-3 py-1 text-[11px] text-gray-400">{item.label}</span></div>;
                      }

                      const message = item.message;
                      const mine = String(message?.sender?._id || message?.sender) === String(currentUserId);
                      const previous = groupedMessages[index - 1]?.message;
                      const next = groupedMessages[index + 1]?.message;
                      const samePrev = previous && String(previous?.sender?._id || previous?.sender) === String(message?.sender?._id || message?.sender);
                      const sameNext = next && String(next?.sender?._id || next?.sender) === String(message?.sender?._id || message?.sender);
                      const showAvatar = !mine && !sameNext;
                      const showSeen = mine && message._id === latestSeenOwnMessageId;

                      return (
                        <div
                          key={message._id || `${message.createdAt}-${index}`}
                          className={`mb-1 flex group/msg 
                ${mine ? 'justify-end' : 'justify-start'} 
                ${samePrev ? 'mt-1' : 'mt-3'}
                outline-none select-none 
                [-webkit-tap-highlight-color:transparent]`}
                          onContextMenu={(event) => openContext(event, message)}
                          onTouchStart={() => startLongPress(message)}
                          onTouchEnd={clearLongPress}
                          onTouchMove={clearLongPress}
                          onMouseEnter={() => setHoveredMessageId(message._id)}
                          onMouseLeave={() => {
                            setHoveredMessageId(null);
                          }}
                        >
                          <div className={`relative flex max-w-full flex-col 
                   ${mine ? 'items-end' : 'items-start'}`}>
                            <div className={`flex max-w-full items-end gap-1 
                   ${mine ? 'flex-row-reverse' : ''}`}>
                              {!mine ? (showAvatar ? <Avatar user={otherUser} className="h-7 w-7" /> : <div className="w-7" />) : null}
                              
                              <div className="relative">
                                {reactionPickerFor === message._id && (
                                  <ReactionPicker
                                    mine={mine}
                                    onSelect={(emoji) => handleSelectReaction(message._id, emoji)}
                                  />
                                )}
                                {renderBubble(message, mine)}
                                {reactions[message._id] && (
                                  <div
                                    className={`absolute -bottom-3 ${mine ? 'right-2' : 'left-2'} 
                      text-sm bg-[#1a1a1a] border border-white/10 
                      rounded-full px-1.5 py-0.5 leading-none cursor-pointer
                      hover:scale-110 transition-transform`}
                                    onClick={() => handleSelectReaction(message._id, reactions[message._id])}
                                  >
                                    {reactions[message._id]}
                                  </div>
                                )}
                              </div>

                              {!message.isDeleted && (
                                <MessageActions
                                  message={message}
                                  mine={mine}
                                  onReply={() => handleReply(message)}
                                  onReact={() => handleReact(message)}
                                  onMore={(e) => handleMoreMenu(e, message)}
                                />
                              )}
                            </div>
                            {showSeen ? <span className="mt-1 px-2 text-[11px] font-medium text-gray-500">{formatSeenAgo(message.seenAt)}</span> : null}
                          </div>
                        </div>
                      );
                    })}
                    {activeTyping.length > 0 ? <TypingIndicator /> : null}
                  </div>
                )}
              </div>

              {replyTo ? (
                <div className="border-t border-white/10 bg-[#050505] px-4 py-2">
                  <div className="flex items-center justify-between rounded-2xl bg-[#121212] px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white/80">Replying to {replyTo.senderName}</p>
                      <p className="truncate text-xs text-gray-400">{replyTo.text || 'Attachment'}</p>
                    </div>
                    <button onClick={() => setReplyTo(null)} className="rounded-full p-1 text-gray-500 transition hover:bg-white/5 hover:text-white">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="border-t border-white/10 px-3 py-2 flex-shrink-0">
                <div className="flex items-center gap-2 rounded-full bg-[#111111] px-3 py-2 min-h-[48px]">
                  <button className="rounded-full p-2 text-gray-400 transition hover:bg-white/5 hover:text-white"><Smile size={18} /></button>
                  <input
                    value={input}
                    onChange={(event) => {
                      setInput(event.target.value);
                      if (activeConversation?._id && currentUserId) {
                        emitTyping(activeConversation._id, currentUserId);
                        scheduleStopTyping();
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Message..."
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-500 min-w-0 leading-normal"
                  />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="rounded-full p-2 text-gray-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"><ImagePlus size={18} /></button>
                  <button className="rounded-full p-2 text-gray-400 transition hover:bg-white/5 hover:text-white"><Sticker size={18} /></button>
                  <button className="rounded-full p-2 text-gray-400 transition hover:bg-white/5 hover:text-white"><Mic size={18} /></button>
                  {input.trim() && !sending ? (
                    <button
                      onClick={() => handleSend()}
                      disabled={sending || uploading}
                      className="rounded-full p-2 text-[#7C3AED] transition hover:bg-white/5 
                 hover:text-[#8b5cf6] disabled:opacity-50"
                    >
                      <SendHorizontal size={18} />
                    </button>
                  ) : null}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />
              </div>
            </>
          )}
        </section>
      </div>

      {contextMenu ? (
        <div ref={contextRef} className="fixed z-50 min-w-[180px] rounded-2xl border border-white/10 bg-[#111111] p-1 shadow-2xl" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <button
            onClick={() => {
              const senderName = String(contextMenu.message?.sender?._id || contextMenu.message?.sender) === String(currentUserId) ? 'You' : getUserName(otherUser);
              setReplyTo({
                messageId: contextMenu.message._id,
                text: contextMenu.message.text || 'Attachment',
                senderName,
                senderId: contextMenu.message?.sender?._id || contextMenu.message?.sender,
              });
              setContextMenu(null);
            }}
            className="flex w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-white/5"
          >
            Reply
          </button>
          {contextMenu?.message?.text && !contextMenu?.message?.isDeleted ? (
            <button
              onClick={() => {
                if (contextMenu?.message?.text) {
                  navigator.clipboard.writeText(contextMenu.message.text)
                    .catch(() => {});
                }
                setContextMenu(null);
              }}
              className="flex w-full rounded-xl px-3 py-2 text-left 
               text-sm transition hover:bg-white/5"
            >
              Copy
            </button>
          ) : null}
          {String(contextMenu.message?.sender?._id || contextMenu.message?.sender) === String(currentUserId) ? (
            <button onClick={() => handleDelete(contextMenu.message)} className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-red-400 transition hover:bg-red-500/10">
              Unsend
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
