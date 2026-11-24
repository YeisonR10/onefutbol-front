import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { aficionadosApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import { useToast } from './Toast';

const getAficionados = (response) => {
  const data = response?.data ?? response;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.aficionados)) return data.aficionados;
  return [];
};

const getNotificationMessage = (notification) => {
  const message = notification?.message || 'Recibiste una nueva notificación';
  const data = notification?.data || {};

  if (notification?.type === 'ANOTACION') {
    const annotation = data.anotacion || {};
    const details = [
      data.jugador?.nombre,
      annotation.tipo,
      annotation.descripcion,
    ].filter(Boolean);
    return details.length ? `${message} · ${details.join(' · ')}` : message;
  }

  if (notification?.type === 'PARTIDO_FINALIZADO') {
    const annotationSummaries = Array.isArray(data.anotaciones)
      ? data.anotaciones.map((annotation) => {
          const playerName = [annotation.jugadorNombre, annotation.jugadorApellido].filter(Boolean).join(' ');
          return `${annotation.minuto ?? '—'}' ${annotation.tipo || 'Anotación'}${playerName ? `: ${playerName}` : ''}`;
        })
      : [];
    return annotationSummaries.length
      ? `${message} · ${annotationSummaries.join('; ')}`
      : message;
  }

  return message;
};

export default function RealtimeNotifications() {
  const { isAuthenticated, loading, token, user } = useAuth();
  const { showToast } = useToast();
  const { addNotification, setAficionadoId } = useNotifications();

  useEffect(() => {
    setAficionadoId(null);
    if (loading || !isAuthenticated || !user?.email) return undefined;

    let cancelled = false;
    let socket;
    let connectionErrorShown = false;

    const connect = async () => {
      try {
        const aficionados = getAficionados(await aficionadosApi.getAll());
        if (cancelled) return;

        const email = String(user.email).trim().toLowerCase();
        const aficionado = aficionados.find((item) =>
          String(item.correoElectronico ?? item.email ?? '').trim().toLowerCase() === email);
        const aficionadoId = Number(aficionado?.id);

        if (!Number.isSafeInteger(aficionadoId) || aficionadoId <= 0) {
          showToast('No se encontró un perfil de aficionado asociado al correo de la sesión.', 'warning', 7000);
          return;
        }

        setAficionadoId(aficionadoId);
        const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;
        socket = io(socketUrl, { transports: ['websocket'] });
        socket.on('connect', () => {
          socket.emit('subscribe_aficionado', { aficionadoId });
        });
        socket.on('new_notification', (notification) => {
          addNotification({
            ...notification,
            displayMessage: getNotificationMessage(notification),
          }, aficionadoId);
        });
        socket.on('connect_error', () => {
          if (!cancelled && !connectionErrorShown) {
            connectionErrorShown = true;
            showToast('No se pudo conectar al servicio de notificaciones en tiempo real.', 'error');
          }
        });
      } catch (error) {
        if (!cancelled) {
          showToast(error.message || 'No se pudo activar el servicio de notificaciones.', 'error');
        }
      }
    };

    connect();
    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [addNotification, isAuthenticated, loading, setAficionadoId, showToast, token, user?.email]);

  return null;
}
