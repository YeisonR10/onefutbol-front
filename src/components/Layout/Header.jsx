import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ConfirmDialog from '../common/ConfirmDialog';
import { useToast } from '../common/Toast';

export default function Header() {
  const { user, logout, refreshUserProfile } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const loadedProfileId = useRef(null);

  useEffect(() => {
    if (!user?.id || loadedProfileId.current === user.id) return;
    loadedProfileId.current = user.id;

    refreshUserProfile().catch((err) => {
      loadedProfileId.current = null;
      showToast(err.message || 'No se pudo cargar la información del usuario', 'error');
    });
  }, [user?.id, refreshUserProfile, showToast]);

  // Derive title from current path
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return { title: 'Panel de Control', subtitle: 'Vista general del sistema de seguridad' };
      case '/users':
        return { title: 'Gestión de Usuarios', subtitle: 'Administración de cuentas, perfiles y estados' };
      case '/roles':
        return { title: 'Roles de Sistema', subtitle: 'Definición de roles y responsabilidades' };
      case '/permissions':
        return { title: 'Catálogo de Permisos', subtitle: 'Endpoints, verbos HTTP y modelos asegurados' };
      case '/security':
        return { title: 'Matriz de Seguridad', subtitle: 'Asignación de permisos a roles del sistema' };
      default:
        return { title: 'OneSports Security', subtitle: 'Panel de Administración' };
    }
  };

  const { title, subtitle } = getPageTitle();

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate('/login');
  };

  return (
    <>
      <header
        style={{
          height: 'var(--header-height)',
          backgroundColor: 'rgba(13, 21, 38, 0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        {/* Page Title & Subtitle */}
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
            {title}
          </h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        </div>

        {/* Right side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Notifications button */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn-icon"
              style={{ position: 'relative' }}
              onClick={() => setShowNotificationMenu((prev) => !prev)}
              title="Notificaciones"
            >
              <Bell size={19} />
              <span
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent)',
                  boxShadow: '0 0 6px var(--accent)',
                }}
              />
            </button>

            {/* Notification popup */}
            {showNotificationMenu && (
              <div
                className="animate-slide-up"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '120%',
                  width: '300px',
                  backgroundColor: '#111827',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.7)',
                  padding: '14px',
                  zIndex: 100,
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
                  Notificaciones del Sistema
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  ✅ Conexión con Backend Spring Boot activa en puerto 8080.
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '8px 0' }}>
                  🔒 Sesión autenticada con token JWT válido.
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              height: '24px',
              width: '1px',
              backgroundColor: 'var(--border)',
            }}
          />

          {/* OneSports Platform Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 800,
              letterSpacing: '0.02em',
              color: '#ffffff',
            }}
          >
            <Shield size={14} color="var(--accent)" />
            <span>One<span style={{ color: 'var(--accent)' }}>Sports</span></span>
          </div>

          <div
            style={{
              height: '24px',
              width: '1px',
              backgroundColor: 'var(--border)',
            }}
          />

          {/* User Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-dim)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                color: 'var(--accent)',
                fontSize: '0.88rem',
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>
                {user?.name || 'Administrador'}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {user?.email || 'admin@onesports.com'}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginLeft: '8px',
              borderColor: 'var(--border)',
            }}
            title="Cerrar sesión"
          >
            <LogOut size={15} color="var(--danger)" />
            <span style={{ color: 'var(--text-secondary)' }}>Salir</span>
          </button>
        </div>
      </header>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmLogout}
        title="Cerrar Sesión"
        message="¿Estás seguro de que deseas salir del panel de administración de OneSports?"
        confirmText="Cerrar sesión"
        cancelText="Permanecer"
        variant="danger"
      />
    </>
  );
}
