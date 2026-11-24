import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useToast } from '../components/common/Toast';

const NotificationsContext = createContext(null);
const STORAGE_PREFIX = 'onefutbol.notifications.';
const MAX_NOTIFICATIONS = 50;

export function NotificationsProvider({ children }) {
  const { showToast } = useToast();
  const [aficionadoId, setAficionadoIdState] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const activeAficionadoId = useRef(null);
  const notificationsRef = useRef([]);

  const saveNotifications = useCallback((id, items) => {
    if (id == null) return;
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(items));
    } catch {
      showToast('No se pudo guardar el historial de notificaciones en este navegador.', 'warning');
    }
  }, [showToast]);

  const setAficionadoId = useCallback((id) => {
    const parsedId = Number(id);
    const nextAficionadoId = Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : null;
    if (activeAficionadoId.current === nextAficionadoId) return;

    activeAficionadoId.current = nextAficionadoId;
    let storedNotifications = [];
    if (nextAficionadoId != null) {
      try {
        const stored = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${nextAficionadoId}`) || '[]');
        if (Array.isArray(stored)) {
          storedNotifications = stored
            .filter((item) => item && typeof item.id === 'string')
            .slice(0, MAX_NOTIFICATIONS);
        }
      } catch {
        showToast('No se pudo leer el historial de notificaciones guardado.', 'warning');
      }
    }

    notificationsRef.current = storedNotifications;
    setNotifications(storedNotifications);
    setAficionadoIdState(nextAficionadoId);
  }, [showToast]);

  const addNotification = useCallback((notification, ownerId) => {
    const parsedOwnerId = Number(ownerId);
    if (activeAficionadoId.current !== parsedOwnerId) return;

    const item = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      receivedAt: new Date().toISOString(),
      read: false,
    };
    const nextNotifications = [item, ...notificationsRef.current].slice(0, MAX_NOTIFICATIONS);
    notificationsRef.current = nextNotifications;
    setNotifications(nextNotifications);
    saveNotifications(parsedOwnerId, nextNotifications);
  }, [saveNotifications]);

  const markAsRead = useCallback((notificationId) => {
    const id = activeAficionadoId.current;
    if (id == null) return;
    const nextNotifications = notificationsRef.current.map((item) =>
      item.id === notificationId ? { ...item, read: true } : item);
    notificationsRef.current = nextNotifications;
    setNotifications(nextNotifications);
    saveNotifications(id, nextNotifications);
  }, [saveNotifications]);

  const markAllAsRead = useCallback(() => {
    const id = activeAficionadoId.current;
    if (id == null) return;
    const nextNotifications = notificationsRef.current.map((item) => ({ ...item, read: true }));
    notificationsRef.current = nextNotifications;
    setNotifications(nextNotifications);
    saveNotifications(id, nextNotifications);
  }, [saveNotifications]);

  const clearNotifications = useCallback(() => {
    const id = activeAficionadoId.current;
    notificationsRef.current = [];
    setNotifications([]);
    if (id == null) return;
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
    } catch {
      showToast('No se pudo borrar el historial de notificaciones del navegador.', 'warning');
    }
  }, [showToast]);

  const value = useMemo(() => ({
    aficionadoId,
    notifications,
    unreadCount: notifications.filter((item) => !item.read).length,
    setAficionadoId,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  }), [
    aficionadoId,
    notifications,
    setAficionadoId,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  ]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications debe ser usado dentro de un NotificationsProvider');
  }
  return context;
}
