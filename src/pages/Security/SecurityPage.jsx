import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { rolesApi, permissionsApi, rolePermissionsApi } from '../../api/client';
import { useToast } from '../../components/common/Toast';

// Columnas de la matriz: label visible → métodos HTTP que representa
const MATRIX_COLUMNS = [
  { key: 'GET',    label: 'Ver'         },
  { key: 'POST',   label: 'Crear'       },
  { key: 'PUT',    label: 'Actualizar'  },
  { key: 'DELETE', label: 'Eliminar'    },
  { key: 'PATCH',  label: 'Parcial'     },
];

// Ícono resource genérico por modelo
function ResourceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
      <circle cx="12" cy="8" r="4" />
      <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
    </svg>
  );
}

// Checkbox visual estilo imagen
function MatrixCheckbox({ checked, loading, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={disabled || loading ? undefined : onChange}
      disabled={disabled || loading}
      style={{
        width: '26px',
        height: '26px',
        borderRadius: '5px',
        border: checked
          ? '2px solid var(--accent)'
          : '2px solid var(--border-light)',
        background: checked
          ? 'var(--accent)'
          : 'rgba(255,255,255,0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'var(--transition)',
        opacity: disabled ? 0.4 : 1,
        padding: 0,
      }}
      title={checked ? 'Quitar permiso' : 'Asignar permiso'}
    >
      {loading ? (
        <span
          style={{
            width: '12px',
            height: '12px',
            border: '2px solid rgba(0,0,0,0.3)',
            borderTop: '2px solid #000',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 0.7s linear infinite',
          }}
        />
      ) : checked ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : null}
    </button>
  );
}

export default function SecurityPage() {
  const location = useLocation();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(location.state?.roleId || '');
  const [loading, setLoading] = useState(true);

  // { permId: true } mientras está cargando esa celda
  const [cellLoading, setCellLoading] = useState({});

  // Grupos colapsados
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Búsqueda
  const [searchQuery, setSearchQuery] = useState('');

  const { showToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes, rolePermsRes] = await Promise.all([
        rolesApi.getAll().catch(() => []),
        permissionsApi.getAll().catch(() => []),
        rolePermissionsApi.getAll().catch(() => []),
      ]);

      setRoles(rolesRes || []);
      setPermissions(permsRes || []);
      setRolePermissions(rolePermsRes || []);

      if (!selectedRoleId && rolesRes && rolesRes.length > 0) {
        setSelectedRoleId(rolesRes[0].id);
      }
    } catch (err) {
      showToast(err.message || 'Error al cargar matriz de seguridad', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Rol activo
  const activeRole = useMemo(
    () => roles.find((r) => String(r.id) === String(selectedRoleId)) || null,
    [roles, selectedRoleId]
  );

  // Set de IDs de permisos asignados al rol activo
  const assignedPermissionIds = useMemo(() => {
    if (!activeRole) return new Set();
    const ids = new Set();
    rolePermissions.forEach((rp) => {
      const rId = rp.roleId || rp.role?.id;
      const pId = rp.permission?.id || rp.permissionId;
      if (String(rId) === String(activeRole.id)) ids.add(pId);
    });
    return ids;
  }, [rolePermissions, activeRole]);

  // Agrupar permisos por modelo
  const groupedPermissions = useMemo(() => {
    const filtered = permissions.filter((p) => {
      if (!searchQuery) return true;
      return (
        p.url?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.model?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

    const groups = {};
    filtered.forEach((p) => {
      const model = p.model || 'Sin módulo';
      if (!groups[model]) groups[model] = [];
      groups[model].push(p);
    });
    return groups;
  }, [permissions, searchQuery]);

  const sortedGroupKeys = useMemo(
    () => Object.keys(groupedPermissions).sort(),
    [groupedPermissions]
  );

  // Contar permisos asignados
  const assignedCount = assignedPermissionIds.size;
  const totalCount = permissions.length;

  // Toggle grupo colapsado
  const toggleGroup = (model) => {
    setCollapsedGroups((prev) => ({ ...prev, [model]: !prev[model] }));
  };

  // Toggle asignación de permiso
  const handleToggle = async (perm) => {
    if (!activeRole) return;
    const isAssigned = assignedPermissionIds.has(perm.id);

    setCellLoading((prev) => ({ ...prev, [perm.id]: true }));
    try {
      if (isAssigned) {
        await rolePermissionsApi.remove(activeRole.id, perm.id);
        showToast(`Permiso [${perm.method}] ${perm.url} removido`, 'info');
      } else {
        await rolePermissionsApi.assign({ roleId: activeRole.id, permissionId: perm.id });
        showToast(`Permiso [${perm.method}] ${perm.url} asignado`, 'success');
      }
      const updated = await rolePermissionsApi.getAll();
      setRolePermissions(updated || []);
    } catch (err) {
      showToast(err.message || 'Error al cambiar permiso', 'error');
    } finally {
      setCellLoading((prev) => ({ ...prev, [perm.id]: false }));
    }
  };

  // Toggle toda una columna (método) de un grupo
  const handleToggleGroupColumn = async (model, method) => {
    if (!activeRole) return;
    const groupPerms = groupedPermissions[model] || [];
    const colPerms = groupPerms.filter((p) => p.method === method);
    if (colPerms.length === 0) return;

    const allAssigned = colPerms.every((p) => assignedPermissionIds.has(p.id));

    // Marcar loading para todos
    const loadingPatch = {};
    colPerms.forEach((p) => { loadingPatch[p.id] = true; });
    setCellLoading((prev) => ({ ...prev, ...loadingPatch }));

    try {
      await Promise.all(
        colPerms.map((p) =>
          allAssigned
            ? rolePermissionsApi.remove(activeRole.id, p.id)
            : assignedPermissionIds.has(p.id)
              ? Promise.resolve()
              : rolePermissionsApi.assign({ roleId: activeRole.id, permissionId: p.id })
        )
      );
      const updated = await rolePermissionsApi.getAll();
      setRolePermissions(updated || []);
      showToast(allAssigned ? 'Permisos removidos' : 'Permisos asignados', 'success');
    } catch (err) {
      showToast(err.message || 'Error al cambiar permisos', 'error');
    } finally {
      setCellLoading((prev) => {
        const next = { ...prev };
        colPerms.forEach((p) => { next[p.id] = false; });
        return next;
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Top Bar: Encabezado + Selector de Rol */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '18px 24px',
          background: 'linear-gradient(90deg, #111827 0%, #1a2744 100%)',
          borderColor: 'var(--border-light)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px', height: '42px', borderRadius: '10px',
              backgroundColor: 'var(--accent-dim)',
              border: '1px solid rgba(34, 197, 94, 0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)',
            }}
          >
            <ShieldAlert size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
              Matriz de Control de Acceso
            </span>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              Configurar Políticas de Seguridad por Rol
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label htmlFor="role-select" style={{ margin: 0, color: 'var(--text-secondary)', fontWeight: 600 }}>
            Rol Objetivo:
          </label>
          <select
            id="role-select"
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            style={{
              minWidth: '220px',
              backgroundColor: '#0a0f1e',
              borderColor: 'var(--accent)',
              fontWeight: 600,
            }}
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner spinner-lg" />
          <p style={{ marginTop: '14px', color: 'var(--text-secondary)' }}>
            Cargando matriz de permisos...
          </p>
        </div>
      ) : !activeRole ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          No se ha seleccionado ningún rol. Por favor cree un rol primero.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Barra de búsqueda + stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '400px' }}>
              <input
                type="text"
                placeholder="Buscar por módulo o URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '38px', fontSize: '0.85rem' }}
              />
              <Search
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              <ShieldCheck size={16} color="var(--accent)" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--accent)' }}>{assignedCount}</strong>
                {' / '}
                <strong>{totalCount}</strong>
                {' permisos asignados al rol '}
                <strong style={{ color: '#ffffff' }}>{activeRole.name}</strong>
              </span>
            </div>
          </div>

          {/* Tabla Matriz */}
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: '700px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingLeft: '20px', minWidth: '200px' }}>
                    Recurso
                  </th>
                  {MATRIX_COLUMNS.map((col) => (
                    <th key={col.key} style={{ textAlign: 'center', width: '110px' }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedGroupKeys.length === 0 ? (
                  <tr>
                    <td
                      colSpan={MATRIX_COLUMNS.length + 1}
                      style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}
                    >
                      No se encontraron permisos con ese filtro.
                    </td>
                  </tr>
                ) : (
                  sortedGroupKeys.map((model) => {
                    const groupPerms = groupedPermissions[model];
                    const isCollapsed = collapsedGroups[model];

                    // Cuántos del grupo están asignados
                    const groupAssigned = groupPerms.filter((p) => assignedPermissionIds.has(p.id)).length;

                    return (
                      <React.Fragment key={model}>
                        {/* Fila de encabezado de grupo */}
                        <tr
                          style={{
                            backgroundColor: '#1a2744',
                            cursor: 'pointer',
                          }}
                          onClick={() => toggleGroup(model)}
                        >
                          <td
                            colSpan={1}
                            style={{
                              padding: '10px 20px',
                              fontWeight: 700,
                              color: '#ffffff',
                              fontSize: '0.88rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {isCollapsed
                                ? <ChevronRight size={15} color="var(--text-muted)" />
                                : <ChevronDown size={15} color="var(--text-muted)" />
                              }
                              <span
                                style={{
                                  width: '8px', height: '8px', borderRadius: '50%',
                                  backgroundColor: 'var(--accent)',
                                  display: 'inline-block',
                                  flexShrink: 0,
                                }}
                              />
                              {model}
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  color: 'var(--text-muted)',
                                  fontWeight: 400,
                                  marginLeft: '4px',
                                }}
                              >
                                ({groupAssigned}/{groupPerms.length})
                              </span>
                            </div>
                          </td>

                          {/* Checkboxes de columna para el grupo entero */}
                          {MATRIX_COLUMNS.map((col) => {
                            const colPerms = groupPerms.filter((p) => p.method === col.key);
                            const allChecked = colPerms.length > 0 && colPerms.every((p) => assignedPermissionIds.has(p.id));
                            const someChecked = colPerms.some((p) => assignedPermissionIds.has(p.id));
                            const isColLoading = colPerms.some((p) => cellLoading[p.id]);

                            return (
                              <td key={col.key} style={{ textAlign: 'center', padding: '10px 6px' }}>
                                {colPerms.length > 0 ? (
                                  <div style={{ display: 'flex', justifyContent: 'center' }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MatrixCheckbox
                                      checked={allChecked}
                                      loading={isColLoading}
                                      onChange={() => handleToggleGroupColumn(model, col.key)}
                                    />
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--border-light)', fontSize: '0.7rem' }}>—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>

                        {/* Filas de permisos individuales del grupo */}
                        {!isCollapsed && groupPerms.map((perm) => {
                          // La fila de detalle muestra el URL del permiso
                          const isAssigned = assignedPermissionIds.has(perm.id);

                          return (
                            <tr
                              key={perm.id}
                              style={{
                                backgroundColor: isAssigned
                                  ? 'rgba(34, 197, 94, 0.04)'
                                  : 'transparent',
                              }}
                            >
                              <td
                                style={{
                                  paddingLeft: '42px',
                                  paddingRight: '18px',
                                  paddingTop: '10px',
                                  paddingBottom: '10px',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <ResourceIcon />
                                  <span
                                    style={{
                                      fontFamily: "'JetBrains Mono', monospace",
                                      fontSize: '0.78rem',
                                      color: isAssigned ? '#ffffff' : 'var(--text-secondary)',
                                      wordBreak: 'break-all',
                                    }}
                                  >
                                    {perm.url}
                                  </span>
                                  {/* Badge método */}
                                  <span
                                    style={{
                                      fontSize: '0.65rem',
                                      fontWeight: 700,
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      flexShrink: 0,
                                      backgroundColor:
                                        perm.method === 'GET' ? 'rgba(59,130,246,0.18)' :
                                        perm.method === 'POST' ? 'rgba(34,197,94,0.18)' :
                                        perm.method === 'PUT' ? 'rgba(245,158,11,0.18)' :
                                        perm.method === 'PATCH' ? 'rgba(168,85,247,0.18)' :
                                        'rgba(239,68,68,0.18)',
                                      color:
                                        perm.method === 'GET' ? '#60a5fa' :
                                        perm.method === 'POST' ? '#4ade80' :
                                        perm.method === 'PUT' ? '#fbbf24' :
                                        perm.method === 'PATCH' ? '#c084fc' :
                                        '#f87171',
                                    }}
                                  >
                                    {perm.method}
                                  </span>
                                </div>
                              </td>

                              {MATRIX_COLUMNS.map((col) => (
                                <td key={col.key} style={{ textAlign: 'center', padding: '10px 6px' }}>
                                  {perm.method === col.key ? (
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                      <MatrixCheckbox
                                        checked={isAssigned}
                                        loading={!!cellLoading[perm.id]}
                                        onChange={() => handleToggle(perm)}
                                      />
                                    </div>
                                  ) : (
                                    <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '0.7rem' }}>·</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
