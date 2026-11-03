import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, ShieldCheck, KeyRound, ShieldAlert, Trophy } from 'lucide-react';
import ProfileAccess from './ProfileAccess';

const navItems = [
  { to: '/', label: 'Resumen', icon: LayoutDashboard },
  { to: '/users', label: 'Usuarios', icon: Users },
  { to: '/roles', label: 'Roles', icon: ShieldCheck },
  { to: '/permissions', label: 'Permisos', icon: KeyRound },
  { to: '/security', label: 'Seguridad', icon: ShieldAlert },
];

export default function Sidebar() {
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

      <ProfileAccess placement="sidebar" />
    </aside>
  );
}
