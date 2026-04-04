import { io } from 'socket.io-client';
import api from '../lib/api';

const SOCKET_URL = (
  import.meta.env.VITE_WS_URL
  || (api.defaults.baseURL ? api.defaults.baseURL.replace(/\/api\/?$/, '') : 'http://localhost:5000')
);

let socket = null;
let currentCallbacks = {};
let connectHandler = null;

const eventMap = {
  onNewMessage: 'new-message',
  onUserTyping: 'user-typing',
  onUserStopTyping: 'user-stop-typing',
  onMessageSeenUpdate: 'message-seen-update',
  onMessageRemoved: 'message-removed',
};

const detachListeners = () => {
  if (!socket) return;
  Object.entries(eventMap).forEach(([callbackName, eventName]) => {
    const handler = currentCallbacks?.[callbackName];
    if (handler) socket.off(eventName, handler);
  });
};

const attachListeners = () => {
  if (!socket) return;
  Object.entries(eventMap).forEach(([callbackName, eventName]) => {
    const handler = currentCallbacks?.[callbackName];
    if (handler) socket.on(eventName, handler);
  });
};

export const initChatSocket = (token, callbacks = {}, userId = null) => {
  if (socket) {
    detachListeners();
    currentCallbacks = callbacks || {};
    attachListeners();
    if (socket.connected) {
      if (userId) {
        socket.emit('register', userId);
      }
      return socket;
    }
    socket.connect();
    return socket;
  }

  currentCallbacks = callbacks || {};
  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1500,
    timeout: 10000,
    auth: token ? { token } : {},
  });

  attachListeners();

  connectHandler = () => {
    if (userId) {
      socket.emit('register', userId);
    }
  };

  socket.on('connect', connectHandler);

  socket.on('connect_error', (error) => {
    console.error('[Chat Socket] Connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.warn('[Chat Socket] Disconnected:', reason);
  });

  return socket;
};

export const disconnectChatSocket = () => {
  if (!socket) return;
  detachListeners();
  if (connectHandler) {
    socket.off('connect', connectHandler);
    connectHandler = null;
  }
  socket.disconnect();
  socket = null;
  currentCallbacks = {};
};

export const joinRoom = (conversationId) => {
  if (socket && conversationId) socket.emit('join-room', conversationId);
};

export const leaveRoom = (conversationId) => {
  if (socket && conversationId) socket.emit('leave-room', conversationId);
};

export const emitSendMessage = (data) => {
  if (socket) socket.emit('send-message', data);
};

export const emitTyping = (conversationId, userId) => {
  if (socket && conversationId && userId) socket.emit('typing', { conversationId, userId });
};

export const emitStopTyping = (conversationId, userId) => {
  if (socket && conversationId && userId) socket.emit('stop-typing', { conversationId, userId });
};

export const emitMessageSeen = (conversationId, messageId, userId, seenAt = null) => {
  if (socket && conversationId && messageId && userId) {
    socket.emit('message-seen', { conversationId, messageId, userId, seenAt });
  }
};

export const emitMessageDeleted = (conversationId, messageId) => {
  if (socket && conversationId && messageId) {
    socket.emit('message-deleted', { conversationId, messageId });
  }
};
