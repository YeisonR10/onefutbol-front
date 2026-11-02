import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Search,
  Plus,
  Trash2,
  Check,
  Filter,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { rolesApi, permissionsApi, rolePermissionsApi } from '../../api/client';
import Badge from '../../components/common/Badge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useToast } from '../../components/common/Toast';

export default function SecurityPage() {
  const location = useLocation();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(location.state?.roleId || '');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Filters for left panel
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModel, setFilterModel] = useState('ALL');
  const [filterMethod, setFilterMethod] = useState('ALL');

  // Confirm dialog for removing permission
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

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

      // If no role selected and roles exist, select the first one
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

  // Currently selected role object
  const activeRole = useMemo(() => {
    return roles.find((r) => String(r.id) === String(selectedRoleId)) || null;
  }, [roles, selectedRoleId]);

  // Set of assigned permission IDs for active role
  const assignedPermissionIds = useMemo(() => {
    if (!activeRole) return new Set();
    const ids = new Set();
    rolePermissions.forEach((rp) => {
      const rId = rp.roleId || rp.role?.id;
      const pId = rp.permission?.id || rp.permissionId;
      if (String(rId) === String(activeRole.id)) {
        ids.add(pId);
      }
    });
    return ids;
  }, [rolePermissions, activeRole]);

  // List of full permission objects assigned to the active role
  const assignedPermissionsList = useMemo(() => {
    return permissions.filter((p) => assignedPermissionIds.has(p.id));
  }, [permissions, assignedPermissionIds]);

  // Unique models list
  const uniqueModels = useMemo(() => {
    const set = new Set();
    permissions.forEach((p) => {
      if (p.model) set.add(p.model);
    });
    return Array.from(set).sort();
  }, [permissions]);

  // Filtered permissions list for left panel
  const filteredPermissions = useMemo(() => {
    return permissions.filter((p) => {
      const matchesSearch =
        p.url?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.model?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesModel = filterModel === 'ALL' || p.model === filterModel;
      const matchesMethod = filterMethod === 'ALL' || p.method === filterMethod;

      return matchesSearch && matchesModel && matchesMethod;
    });
  }, [permissions, searchQuery, filterModel, filterMethod]);

  // Assign permission to active role
  const handleAssignPermission = async (permission) => {
    if (!activeRole) return;
    setActionLoadingId(permission.id);
    try {
      await rolePermissionsApi.assign({
        roleId: activeRole.id,
        permissionId: permission.id,
      });

      showToast(`Permiso [${permission.method}] ${permission.url} asignado`, 'success');

      // Refresh role permissions
      const updated = await rolePermissionsApi.getAll();
      setRolePermissions(updated || []);
    } catch (err) {
      showToast(err.message || 'Error al asignar permiso', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Remove permission from active role
  const handleRemovePermission = (permission) => {
    if (!activeRole) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Quitar Permiso de Rol',
      message: `¿Desea desvincular el permiso [${permission.method}] ${permission.url} del rol "${activeRole.name}"?`,
      onConfirm: async () => {
        setActionLoadingId(permission.id);
        try {
          await rolePermissionsApi.remove(activeRole.id, permission.id);
          showToast(`Permiso [${permission.method}] removido`, 'success');
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));

          // Refresh role permissions
          const updated = await rolePermissionsApi.getAll();
          setRolePermissions(updated || []);
        } catch (err) {
          showToast(err.message || 'Error al remover permiso', 'error');
        } finally {
          setActionLoadingId(null);
        }
      },
    });
  };

  // Method distribution stats for active role
  const methodStats = useMemo(() => {
    const stats = { GET: 0, POST: 0, PUT: 0, PATCH: 0, DELETE: 0 };
    assignedPermissionsList.forEach((p) => {
      if (stats[p.method] !== undefined) {
        stats[p.method] += 1;
      }
    });
    return stats;
  }, [assignedPermissionsList]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Bar: Role Selector */}
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
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: 'var(--accent-dim)',
              border: '1px solid rgba(34, 197, 94, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
            }}
          >
            <ShieldAlert size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
              Matriz de Control de Acceso (HU-SE-06)
            </span>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              Configurar Políticas de Seguridad por Rol
            </div>
          </div>
        </div>

        {/* Role Selector dropdown */}
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
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner spinner-lg"></div>
          <p style={{ marginTop: '14px', color: 'var(--text-secondary)' }}>
            Cargando catálogo de permisos y roles...
          </p>
        </div>
      ) : !activeRole ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          No se ha seleccionado ningún rol. Por favor cree un rol primero.
        </div>
      ) : (
        /* Dual Panel Layout */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* Left Panel: Available Permissions with Filters and Assign Buttons */}
          <div className="card" style={{ padding: '22px' }}>
            <div className="card-header" style={{ alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                  Catálogo de Permisos
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Selecciona los endpoints autorizados para este rol
                </p>
              </div>

              <span
                style={{
                  fontSize: '0.78rem',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-secondary)',
                }}
              >
                {filteredPermissions.length} disponibles
              </span>
            </div>

            {/* Search and Filters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Filtrar por URL o modelo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '38px', fontSize: '0.85rem' }}
                />
                <Search
                  size={16}
                  color="var(--text-muted)"
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  value={filterMethod}
                  onChange={(e) => setFilterMethod(e.target.value)}
                  style={{ flex: 1, fontSize: '0.82rem', padding: '8px 10px' }}
                >
                  <option value="ALL">Todos los métodos</option>
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>

                <select
                  value={filterModel}
                  onChange={(e) => setFilterModel(e.target.value)}
                  style={{ flex: 1, fontSize: '0.82rem', padding: '8px 10px' }}
                >
                  <option value="ALL">Todos los módulos</option>
                  {uniqueModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* List of Permissions */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '620px',
                overflowY: 'auto',
                paddingRight: '4px',
              }}
            >
              {filteredPermissions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No se encontraron permisos con los filtros aplicados.
                </div>
              ) : (
                filteredPermissions.map((perm) => {
                  const isAssigned = assignedPermissionIds.has(perm.id);
                  const isPending = actionLoadingId === perm.id;

                  return (
                    <div
                      key={perm.id}
                      style={{
                        padding: '12px 14px',
                        backgroundColor: isAssigned ? 'rgba(34, 197, 94, 0.05)' : 'var(--bg-secondary)',
                        border: isAssigned ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        transition: 'var(--transition)',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <Badge method={perm.method} />
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-muted)',
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {perm.model}
                          </span>
                        </div>
                        <div
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: '0.82rem',
                            color: '#ffffff',
                            wordBreak: 'break-all',
                          }}
                        >
                          {perm.url}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div>
                        {isAssigned ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleRemovePermission(perm)}
                            disabled={isPending}
                            style={{
                              color: 'var(--danger)',
                              borderColor: 'rgba(239, 68, 68, 0.3)',
                              backgroundColor: 'rgba(239, 68, 68, 0.08)',
                            }}
                            title="Quitar permiso"
                          >
                            {isPending ? (
                              <span className="spinner"></span>
                            ) : (
                              <>
                                <Check size={14} color="var(--accent)" />
                                <span>Asignado</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => handleAssignPermission(perm)}
                            disabled={isPending}
                            title="Asignar permiso a este rol"
                          >
                            {isPending ? (
                              <span className="spinner"></span>
                            ) : (
                              <>
                                <Plus size={14} />
                                <span>Asignar</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Role Summary and Assigned Permissions */}
          <div className="card" style={{ padding: '22px' }}>
            <div className="card-header">
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                  Resumen de Rol
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Permisos efectivos asignados
                </p>
              </div>

              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(34, 197, 94, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent)',
                }}
              >
                <ShieldCheck size={18} />
              </div>
            </div>

            {/* Role Info Box */}
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '18px',
              }}
            >
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                {activeRole.name}
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {activeRole.description || 'Sin descripción'}
              </p>

              {/* Method Counters */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                  marginTop: '14px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem' }}>
                  <Badge method="GET" />: <strong>{methodStats.GET}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem' }}>
                  <Badge method="POST" />: <strong>{methodStats.POST}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem' }}>
                  <Badge method="PUT" />: <strong>{methodStats.PUT}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem' }}>
                  <Badge method="DELETE" />: <strong>{methodStats.DELETE}</strong>
                </div>
              </div>
            </div>

            {/* Assigned Permissions List with quick remove button */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#ffffff' }}>
                  Permisos Vinculados ({assignedPermissionsList.length})
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Total {permissions.length} en el catálogo
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '460px',
                  overflowY: 'auto',
                }}
              >
                {assignedPermissionsList.length === 0 ? (
                  <div
                    style={{
                      padding: '30px 16px',
                      textAlign: 'center',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      border: '1px dashed var(--border)',
                      fontSize: '0.84rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    No hay permisos asignados todavía a este rol.
                    <br />
                    Haz clic en "Asignar" en la lista de la izquierda.
                  </div>
                ) : (
                  assignedPermissionsList.map((perm) => (
                    <div
                      key={perm.id}
                      style={{
                        padding: '10px 14px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <Badge method={perm.method} />
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {perm.model}
                          </span>
                        </div>
                        <div
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: '0.8rem',
                            color: '#ffffff',
                            wordBreak: 'break-all',
                          }}
                        >
                          {perm.url}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => handleRemovePermission(perm)}
                        style={{ color: 'var(--danger)', padding: '6px' }}
                        title="Quitar permiso"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Quitar permiso"
        variant="danger"
        loading={actionLoadingId !== null}
      />
    </div>
  );
}

