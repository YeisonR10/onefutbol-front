import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, ShieldCheck, KeyRound, ShieldAlert, Trophy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/', label: 'Resumen', icon: LayoutDashboard },
  { to: '/users', label: 'Usuarios', icon: Users },
  { to: '/roles', label: 'Roles', icon: ShieldCheck },
  { to: '/permissions', label: 'Permisos', icon: KeyRound },
  { to: '/security', label: 'Seguridad', icon: ShieldAlert },
];

export default function Sidebar() {
  const { user } = useAuth();
  const initials = user?.name?.trim()?.charAt(0).toUpperCase() || 'U';

  return (
    <aside className="sidebar" aria-label="Navegación principal">
      <div className="sidebar-brand">
        <span className="brand-mark" aria-hidden="true"><Trophy size={21} /></span>
        <span className="brand-copy">
          <strong>ONE<span>SPORTS</span></strong>
          <small>Security Suite</small>
        </span>
      </div>

      <nav className="sidebar-nav" aria-label="Secciones">
        <span className="nav-caption">Espacio de trabajo</span>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <Icon size={19} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-user">
        <span className="user-avatar" aria-hidden="true">{initials}</span>
        <span className="sidebar-user-copy">
          <strong>{user?.name || 'Administrador'}</strong>
          <small><i aria-hidden="true" /> Sesión activa</small>
        </span>
      </div>
    </aside>
  );
}
