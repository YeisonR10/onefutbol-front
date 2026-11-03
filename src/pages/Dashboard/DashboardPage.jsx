import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  ShieldCheck,
  KeyRound,
  ShieldAlert,
  ArrowRight,
  UserCheck,
  Activity,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { usersApi, rolesApi, permissionsApi, rolePermissionsApi } from '../../api/client';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import { useToast } from '../../components/common/Toast';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    usersCount: 0,
    activeUsersCount: 0,
    rolesCount: 0,
    permissionsCount: 0,
    rolePermissionsCount: 0,
  });
  const [latestUsers, setLatestUsers] = useState([]);
  const [rolesSummary, setRolesSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();

  const loadDashboardData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [users, roles, permissions, rolePermissions] = await Promise.all([
        usersApi.getAll().catch(() => []),
        rolesApi.getAll().catch(() => []),
        permissionsApi.getAll().catch(() => []),
        rolePermissionsApi.getAll().catch(() => []),
      ]);

      const activeUsers = users.filter((u) => u.active !== false).length;

      setStats({
        usersCount: users.length,
        activeUsersCount: activeUsers,
        rolesCount: roles.length,
        permissionsCount: permissions.length,
        rolePermissionsCount: rolePermissions.length,
      });

      // Sort users by ID descending to get the latest
      const sortedUsers = [...users].sort((a, b) => (b.id || 0) - (a.id || 0));
      setLatestUsers(sortedUsers.slice(0, 5));

      // Calculate permissions count per role
      const rolesWithPermCount = roles.map((role) => {
        const count = rolePermissions.filter(
          (rp) => rp.roleId === role.id || (rp.role && rp.role.id === role.id)
        ).length;
        return { ...role, assignedPermissions: count };
      });
      setRolesSummary(rolesWithPermCount);

      if (isManual) {
        showToast('Datos del dashboard actualizados', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Error al cargar los datos del dashboard', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const statCards = [
    {
      title: 'Total Usuarios',
      value: stats.usersCount,
      subvalue: `${stats.activeUsersCount} activos`,
      icon: Users,
      color: '#22c55e',
      link: '/users',
      linkLabel: 'Gestionar usuarios',
    },
    {
      title: 'Roles de Acceso',
      value: stats.rolesCount,
      subvalue: 'Definidos en el sistema',
      icon: ShieldCheck,
      color: '#3b82f6',
      link: '/roles',
      linkLabel: 'Ver roles',
    },
    {
      title: 'Catálogo de Permisos',
      value: stats.permissionsCount,
      subvalue: 'Endpoints protegidos',
      icon: KeyRound,
      color: '#f59e0b',
      link: '/permissions',
      linkLabel: 'Ver permisos',
    },
    {
      title: 'Reglas de Seguridad',
      value: stats.rolePermissionsCount,
      subvalue: 'Asignaciones activas',
      icon: ShieldAlert,
      color: '#a855f7',
      link: '/security',
      linkLabel: 'Matriz de seguridad',
    },
  ];

  const userColumns = [
    {
      key: 'id',
      label: 'ID',
      width: '70px',
      render: (u) => (
        <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
          #{u.id}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Usuario',
      render: (u) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#1a2744',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.8rem',
            }}
          >
            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#ffffff' }}>{u.name}</div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
              {u.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'active',
      label: 'Estado',
      width: '120px',
      render: (u) => <Badge active={u.active} />,
    },
    {
      key: 'actions',
      label: '',
      width: '100px',
      align: 'right',
      render: () => (
        <Link
          to="/users"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.8rem',
            color: 'var(--accent)',
          }}
        >
          <span>Ver</span>
          <ArrowRight size={14} />
        </Link>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Banner & Refresh */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff' }}>
            Panel de Seguridad y Control
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Monitoreo en tiempo real de cuentas, políticas y accesos de OneSports.
          </p>
        </div>

        <button
          className="btn btn-secondary"
          onClick={() => loadDashboardData(true)}
          disabled={loading || refreshing}
        >
          <RefreshCw size={16} className={refreshing ? 'spinner' : ''} />
          <span>Actualizar métricas</span>
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
        }}
      >
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="card"
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '22px',
                border: '1px solid var(--border)',
                background: 'linear-gradient(180deg, #111827 0%, #0d1526 100%)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {card.title}
                  </span>
                  <div
                    style={{
                      fontSize: '2rem',
                      fontWeight: 800,
                      color: '#ffffff',
                      marginTop: '4px',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {loading ? '...' : card.value}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: card.color, marginTop: '2px', fontWeight: 500 }}>
                    {card.subvalue}
                  </div>
                </div>

                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: `${card.color}15`,
                    border: `1px solid ${card.color}35`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: card.color,
                  }}
                >
                  <Icon size={22} />
                </div>
              </div>

              <div
                style={{
                  marginTop: '18px',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(30, 58, 95, 0.4)',
                }}
              >
                <Link
                  to={card.link}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  <span>{card.linkLabel}</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Latest Users & Roles Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
          gap: '24px',
        }}
      >
        {/* Latest Users Card */}
        <div className="card" style={{ padding: '20px' }}>
          <div className="card-header">
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                Últimos Usuarios Registrados
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Cuentas añadidas recientemente
              </p>
            </div>
            <Link to="/users" className="btn btn-secondary btn-sm">
              Ver todos
            </Link>
          </div>

          <Table
            columns={userColumns}
            data={latestUsers}
            loading={loading}
            emptyMessage="No hay usuarios registrados aún"
            itemsPerPage={5}
          />
        </div>

        {/* Roles & Security Summary Card */}
        <div className="card" style={{ padding: '20px' }}>
          <div className="card-header">
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                Resumen de Roles y Cobertura
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Políticas de autorización asignadas
              </p>
            </div>
            <Link to="/security" className="btn btn-primary btn-sm">
              Matriz de Permisos
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="spinner"></div>
            </div>
          ) : rolesSummary.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              No existen roles configurados
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {rolesSummary.slice(0, 6).map((role) => (
                <div
                  key={role.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    transition: 'var(--transition)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#60a5fa',
                      }}
                    >
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.9rem' }}>
                        {role.name}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        {role.description || 'Sin descripción'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(34, 197, 94, 0.12)',
                        color: 'var(--accent)',
                        fontWeight: 600,
                        border: '1px solid rgba(34, 197, 94, 0.25)',
                      }}
                    >
                      {role.assignedPermissions} permisos
                    </span>
                    <Link
                      to="/security"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Configurar permisos"
                    >
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

