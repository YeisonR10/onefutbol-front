import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useNotifications } from '../../context/NotificationsContext';

const getNotificationTitle = (notification) => {
  if (notification.type === 'ANOTACION') return 'Nueva anotación';
  if (notification.type === 'PARTIDO_FINALIZADO') return 'Resultado final';
  return 'Notificación';
};

const getReceivedDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
};

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn-icon"
        title="Notificaciones"
        aria-label={`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ''}`}
        aria-expanded={isOpen}
        aria-controls="notification-panel"
        onClick={() => setIsOpen((open) => !open)}
        style={{ position: 'relative', width: 38, height: 38, color: 'var(--text-primary)' }}
      >
        <Bell size={19} aria-hidden="true" />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -3,
            right: -3,
            minWidth: 17,
            height: 17,
            padding: '0 4px',
            borderRadius: 999,
            display: 'grid',
            placeItems: 'center',
            background: 'var(--accent)',
            color: '#07111f',
            fontSize: '0.65rem',
            fontWeight: 700,
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          id="notification-panel"
          aria-label="Notificaciones"
          style={{
            position: 'absolute',
            zIndex: 1200,
            top: 'calc(100% + 10px)',
            right: 0,
            width: 'min(380px, calc(100vw - 28px))',
            maxHeight: 'min(70vh, 560px)',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid var(--border)',
            borderRadius: 12,
            background: 'var(--bg-secondary)',
            boxShadow: '0 18px 45px rgba(0, 0, 0, .4)',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 14, borderBottom: '1px solid var(--border)' }}>
            <div>
              <strong style={{ color: '#fff' }}>Notificaciones</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 3 }}>
                {unreadCount ? `${unreadCount} sin leer` : 'Al día'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {unreadCount > 0 && (
                <button type="button" className="btn-icon" title="Marcar todas como leídas" aria-label="Marcar todas como leídas" onClick={markAllAsRead}>
                  <CheckCheck size={16} />
                </button>
              )}
              {notifications.length > 0 && (
                <button type="button" className="btn-icon" title="Borrar notificaciones" aria-label="Borrar notificaciones" onClick={clearNotifications}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
          <div style={{ overflowY: 'auto', padding: 8 }}>
            {notifications.length ? notifications.map((notification) => (
              <button
                type="button"
                key={notification.id}
                onClick={() => markAsRead(notification.id)}
                style={{
                  width: '100%',
                  display: 'block',
                  textAlign: 'left',
                  padding: 11,
                  marginBottom: 6,
                  border: '1px solid var(--border)',
                  borderRadius: 9,
                  background: notification.read ? 'transparent' : 'rgba(117,230,163,.08)',
                  color: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <strong style={{ color: '#fff', fontSize: '0.84rem' }}>{getNotificationTitle(notification)}</strong>
                  {!notification.read && <span aria-label="Sin leer" style={{ width: 7, height: 7, flexShrink: 0, borderRadius: '50%', background: 'var(--accent)' }} />}
                </span>
                <span style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.8rem', lineHeight: 1.45, marginTop: 5, overflowWrap: 'anywhere' }}>
                  {notification.displayMessage || notification.message}
                </span>
                <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: 6 }}>
                  {getReceivedDate(notification.receivedAt)}
                </span>
              </button>
            )) : (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: 0, padding: '24px 12px', fontSize: '0.85rem' }}>
                Aún no tienes notificaciones.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
