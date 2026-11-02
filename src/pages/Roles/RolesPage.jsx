import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  Plus,
  Edit2,
  Trash2,
  ArrowRight,
  KeyRound,
  X,
  Search,
  ExternalLink,
} from 'lucide-react';
import { rolesApi, rolePermissionsApi } from '../../api/client';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useToast } from '../../components/common/Toast';

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [rolePermissionsList, setRolePermissionsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected role for right side preview panel
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedRolePermissions, setSelectedRolePermissions] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  // Modal Create / Edit Role
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [roleForm, setRoleForm] = useState({ id: null, name: '', description: '' });
  const [saving, setSaving] = useState(false);

  // Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const fetchRolesData = async () => {
    setLoading(true);
    try {
      const [rolesRes, rolePermsRes] = await Promise.all([
        rolesApi.getAll(),
        rolePermissionsApi.getAll().catch(() => []),
      ]);
      setRoles(rolesRes || []);
      setRolePermissionsList(rolePermsRes || []);

      // If a role was selected, update its permissions
      if (selectedRole) {
        const found = (rolesRes || []).find((r) => r.id === selectedRole.id);
        if (found) {
          handleSelectRole(found);
        }
      }
    } catch (err) {
      showToast(err.message || 'Error al obtener roles', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesData();
  }, []);

  const handleSelectRole = async (role) => {
    setSelectedRole(role);
    setLoadingPermissions(true);
    try {
      // First try getWithPermissions
      const detail = await rolesApi.getWithPermissions(role.id).catch(() => null);
      if (detail && detail.permissions) {
        setSelectedRolePermissions(detail.permissions);
      } else {
        // Fallback to rolePermissionsApi.getByRoleId
        const byRole = await rolePermissionsApi.getByRoleId(role.id).catch(() => []);
        setSelectedRolePermissions(byRole || []);
      }
    } catch (err) {
      console.error(err);
      setSelectedRolePermissions([]);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setRoleForm({ id: null, name: '', description: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role) => {
    setIsEditing(true);
    setRoleForm({ id: role.id, name: role.name, description: role.description || '' });
    setIsModalOpen(true);
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleForm.name.trim()) return;

    setSaving(true);
    try {
      if (isEditing) {
        await rolesApi.update(roleForm.id, {
          name: roleForm.name.trim(),
          description: roleForm.description.trim(),
        });
        showToast('Rol actualizado exitosamente', 'success');
      } else {
        await rolesApi.create({
          name: roleForm.name.trim(),
          description: roleForm.description.trim(),
        });
        showToast('Rol creado exitosamente', 'success');
      }
      setIsModalOpen(false);
      fetchRolesData();
    } catch (err) {
      showToast(err.message || 'Error al guardar rol', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = (role) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Rol',
      message: `¿Está seguro de eliminar el rol "${role.name}"? Los usuarios asignados a este rol perderán sus permisos asociados.`,
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await rolesApi.delete(role.id);
          showToast(`Rol "${role.name}" eliminado`, 'success');
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          if (selectedRole && selectedRole.id === role.id) {
            setSelectedRole(null);
            setSelectedRolePermissions([]);
          }
          fetchRolesData();
        } catch (err) {
          showToast(err.message || 'Error al eliminar rol', 'error');
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  };

  // Filtered roles
  const filteredRoles = roles.filter(
    (r) =>
      r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Columns for the Roles Table
  const columns = [
    {
      key: 'name',
      label: 'Nombre del Rol',
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#60a5fa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#ffffff' }}>{r.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ID: #{r.id}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      label: 'Descripción',
      render: (r) => (
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
          {r.description || 'Sin descripción'}
        </span>
      ),
    },
    {
      key: 'permissionsCount',
      label: 'Permisos',
      width: '140px',
      render: (r) => {
        const count = rolePermissionsList.filter(
          (rp) => rp.roleId === r.id || (rp.role && rp.role.id === r.id)
        ).length;
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: 'rgba(34, 197, 94, 0.12)',
              color: 'var(--accent)',
              fontSize: '0.78rem',
              fontWeight: 600,
              border: '1px solid rgba(34, 197, 94, 0.25)',
            }}
          >
            {count} asignados
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Acciones',
      width: '160px',
      align: 'right',
      render: (r) => (
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="btn-icon"
            onClick={() => handleSelectRole(r)}
            title="Ver permisos asignados"
          >
            <KeyRound size={17} color="#3b82f6" />
          </button>

          <button
            type="button"
            className="btn-icon"
            onClick={() => handleOpenEdit(r)}
            title="Editar rol"
          >
            <Edit2 size={17} color="#f59e0b" />
          </button>

          <button
            type="button"
            className="btn-icon"
            onClick={() => handleDeleteRole(r)}
            title="Eliminar rol"
          >
            <Trash2 size={17} color="#ef4444" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Action Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', width: '380px' }}>
          <input
            type="text"
            placeholder="Buscar por nombre o descripción de rol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
          <Search
            size={17}
            color="var(--text-muted)"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Create Role Button */}
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={18} />
          <span>Crear Rol</span>
        </button>
      </div>

      {/* Main Grid: Roles Table + Right Panel of Permissions */}
      <div style={{ display: 'flex', gap: '24px' }}>
        {/* Left Side: Roles Table */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Table
            columns={columns}
            data={filteredRoles}
            loading={loading}
            emptyMessage="No se encontraron roles configurados."
            itemsPerPage={8}
            onRowClick={(role) => handleSelectRole(role)}
          />
        </div>

        {/* Right Side: Role Permissions Panel */}
        {selectedRole && (
          <div
            className="animate-slide-right"
            style={{
              width: '420px',
              backgroundColor: '#111827',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              maxHeight: 'calc(100vh - 120px)',
              overflowY: 'auto',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={20} color="var(--accent)" />
                  <h3 style={{ fontSize: '1.15rem', color: '#ffffff', fontWeight: 700 }}>
                    {selectedRole.name}
                  </h3>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {selectedRole.description || 'Sin descripción'}
                </p>
              </div>

              <button
                className="btn-icon"
                onClick={() => {
                  setSelectedRole(null);
                  setSelectedRolePermissions([]);
                }}
                title="Cerrar panel"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick action button to Security page */}
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/security', { state: { roleId: selectedRole.id } })}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
              }}
            >
              <span>Gestionar permisos en Matriz</span>
              <ExternalLink size={16} />
            </button>

            {/* List of Permissions */}
            <div>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  marginBottom: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Permisos Asignados</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--accent)' }}>
                  {selectedRolePermissions.length} endpoints
                </span>
              </div>

              {loadingPermissions ? (
                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                  <div className="spinner"></div>
                </div>
              ) : selectedRolePermissions.length === 0 ? (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '0.84rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  Este rol aún no tiene permisos vinculados. Puedes asignarlos desde la Matriz de Seguridad.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedRolePermissions.map((rp, idx) => {
                    const perm = rp.permission || rp;
                    return (
                      <div
                        key={rp.id || idx}
                        style={{
                          padding: '10px 14px',
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <Badge method={perm.method || 'GET'} />
                            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                              [{perm.model || 'General'}]
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: '0.82rem',
                              color: '#ffffff',
                              fontFamily: 'monospace',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={perm.url}
                          >
                            {perm.url}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create or Edit Role */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Editar Rol' : 'Crear Nuevo Rol'}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveRole}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner" style={{ borderTopColor: '#000' }}></span>
                  <span>Guardando...</span>
                </>
              ) : isEditing ? (
                'Guardar Cambios'
              ) : (
                'Crear Rol'
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveRole} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="role-form-name">Nombre del Rol (2 a 50 caracteres) *</label>
            <input
              id="role-form-name"
              type="text"
              required
              minLength={2}
              maxLength={50}
              placeholder="ej. ROLE_ENTRENADOR, ROLE_ADMIN"
              value={roleForm.name}
              onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="role-form-description">Descripción de Responsabilidades *</label>
            <textarea
              id="role-form-description"
              required
              rows={3}
              maxLength={255}
              placeholder="ej. Acceso de gestión a fichas técnicas y calendarios de entrenamiento"
              value={roleForm.description}
              onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Eliminar rol"
        variant="danger"
        loading={confirmLoading}
      />
    </div>
  );
}

