import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ConfirmDialog from '../common/ConfirmDialog';
import { useToast } from '../common/Toast';
import ProfileAccess from './ProfileAccess';

const pageTitles = {
  '/': ['Panel de control', 'Resumen del sistema de seguridad'],
  '/users': ['Usuarios', 'Cuentas, perfiles y estados'],
  '/roles': ['Roles', 'Roles y responsabilidades'],
  '/permissions': ['Permisos', 'Endpoints y recursos protegidos'],
  '/security': ['Seguridad', 'Permisos asignados por rol'],
};

export default function Header() {
  const { user, logout, refreshUserProfile } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const loadedProfileId = useRef(null);

  useEffect(() => {
    if (!user?.id || loadedProfileId.current === user.id) return;
    loadedProfileId.current = user.id;
    refreshUserProfile().catch((err) => {
      loadedProfileId.current = null;
      showToast(err.message || 'No se pudo cargar la información del usuario', 'error');
    });
  }, [user?.id, refreshUserProfile, showToast]);

  const [title, subtitle] = pageTitles[location.pathname] || ['OneSports Security', 'Panel de administración'];

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="app-header">
        <div className="page-heading">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="header-actions">
          <span className="platform-badge"><Shield size={15} aria-hidden="true" /> One<span>Sports</span></span>
          <span className="header-divider" aria-hidden="true" />
          <ProfileAccess placement="header" />
          <button type="button" className="btn btn-secondary btn-sm logout-button" onClick={() => setShowLogoutConfirm(true)}>
            <LogOut size={15} aria-hidden="true" /><span>Cerrar sesión</span>
          </button>
        </div>
      </header>
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmLogout}
        title="Cerrar sesión"
        message="¿Estás seguro de que deseas salir del panel de administración de OneSports?"
        confirmText="Cerrar sesión"
        cancelText="Permanecer"
        variant="danger"
      />
    </>
  );
}
