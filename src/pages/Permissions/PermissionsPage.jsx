import React, { useState, useEffect, useMemo } from 'react';
import {
  KeyRound,
  Plus,
  Search,
  Edit2,
  Trash2,
  Filter,
} from 'lucide-react';
import { permissionsApi } from '../../api/client';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useToast } from '../../components/common/Toast';

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [modelFilter, setModelFilter] = useState('ALL');

  // Modal Create / Edit Permission
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [permForm, setPermForm] = useState({
    id: null,
    url: '',
    method: 'GET',
    model: '',
  });
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

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const data = await permissionsApi.getAll();
      setPermissions(data || []);
    } catch (err) {
      showToast(err.message || 'Error al obtener permisos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  // Extract unique models for filter
  const uniqueModels = useMemo(() => {
    const set = new Set();
    permissions.forEach((p) => {
      if (p.model) set.add(p.model);
    });
    return Array.from(set).sort();
  }, [permissions]);

  // Filtered Permissions
  const filteredPermissions = useMemo(() => {
    return permissions.filter((p) => {
      const matchesSearch =
        p.url?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.model?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMethod =
        methodFilter === 'ALL' || p.method?.toUpperCase() === methodFilter;

      const matchesModel =
        modelFilter === 'ALL' || p.model === modelFilter;

      return matchesSearch && matchesMethod && matchesModel;
    });
  }, [permissions, searchQuery, methodFilter, modelFilter]);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setPermForm({
      id: null,
      url: '/',
      method: 'GET',
      model: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (perm) => {
    setIsEditing(true);
    setPermForm({
      id: perm.id,
      url: perm.url,
      method: perm.method,
      model: perm.model,
    });
    setIsModalOpen(true);
  };

  const handleSavePermission = async (e) => {
    e.preventDefault();
    if (!permForm.url.trim().startsWith('/')) {
      showToast('La URL debe iniciar con "/"', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        url: permForm.url.trim(),
        method: permForm.method,
        model: permForm.model.trim(),
      };

      if (isEditing) {
        await permissionsApi.update(permForm.id, payload);
        showToast('Permiso actualizado correctamente', 'success');
      } else {
        await permissionsApi.create(payload);
        showToast('Permiso registrado con éxito', 'success');
      }

      setIsModalOpen(false);
      fetchPermissions();
    } catch (err) {
      showToast(err.message || 'Error al guardar permiso', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePermission = (perm) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Permiso',
      message: `¿Está seguro de eliminar el permiso [${perm.method}] ${perm.url}? Se desvinculará de todos los roles asociados.`,
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await permissionsApi.delete(perm.id);
          showToast('Permiso eliminado exitosamente', 'success');
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          fetchPermissions();
        } catch (err) {
          showToast(err.message || 'Error al eliminar permiso', 'error');
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  };

  const columns = [
    {
      key: 'id',
      label: 'ID',
      width: '70px',
      render: (p) => (
        <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
          #{p.id}
        </span>
      ),
    },
    {
      key: 'method',
      label: 'Método',
      width: '110px',
      render: (p) => <Badge method={p.method} />,
    },
    {
      key: 'url',
      label: 'Ruta / Endpoint URL',
      render: (p) => (
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: '#ffffff',
            fontSize: '0.86rem',
            wordBreak: 'break-all',
          }}
        >
          {p.url}
        </span>
      ),
    },
    {
      key: 'model',
      label: 'Módulo / Modelo',
      width: '180px',
      render: (p) => (
        <span
          style={{
            padding: '3px 10px',
            borderRadius: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid var(--border)',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
          }}
        >
          {p.model}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      width: '120px',
      align: 'right',
      render: (p) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
          <button
            type="button"
            className="btn-icon"
            onClick={() => handleOpenEdit(p)}
            title="Editar permiso"
          >
            <Edit2 size={16} color="#f59e0b" />
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={() => handleDeletePermission(p)}
            title="Eliminar permiso"
          >
            <Trash2 size={16} color="#ef4444" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Filter and Action Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '750px' }}>
          {/* Search bar */}
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Buscar por endpoint URL o módulo..."
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

          {/* Method Filter */}
          <div style={{ minWidth: '130px' }}>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              style={{ padding: '9px 12px' }}
            >
              <option value="ALL">Todos los métodos</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          {/* Model Filter */}
          {uniqueModels.length > 0 && (
            <div style={{ minWidth: '150px' }}>
              <select
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                style={{ padding: '9px 12px' }}
              >
                <option value="ALL">Todos los módulos</option>
                {uniqueModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Create Permission Button */}
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={18} />
          <span>Nuevo Permiso</span>
        </button>
      </div>

      {/* Permissions Table */}
      <Table
        columns={columns}
        data={filteredPermissions}
        loading={loading}
        emptyMessage="No se encontraron permisos registrados en el catálogo."
        itemsPerPage={10}
      />

      {/* Modal: Create or Edit Permission */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Editar Permiso' : 'Registrar Nuevo Permiso'}
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
              onClick={handleSavePermission}
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
                'Crear Permiso'
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleSavePermission} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="perm-url">Ruta de URL (debe iniciar con /) *</label>
            <input
              id="perm-url"
              type="text"
              required
              placeholder="ej. /api/users o /api/matches/{id}"
              value={permForm.url}
              onChange={(e) => setPermForm({ ...permForm, url: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="perm-method">Método HTTP *</label>
            <select
              id="perm-method"
              required
              value={permForm.method}
              onChange={(e) => setPermForm({ ...permForm, method: e.target.value })}
            >
              <option value="GET">GET (Consulta / Lectura)</option>
              <option value="POST">POST (Creación)</option>
              <option value="PUT">PUT (Actualización Total)</option>
              <option value="PATCH">PATCH (Actualización Parcial)</option>
              <option value="DELETE">DELETE (Eliminación)</option>
            </select>
          </div>

          <div>
            <label htmlFor="perm-model">Módulo / Modelo del Recurso *</label>
            <input
              id="perm-model"
              type="text"
              required
              placeholder="ej. User, Role, Tournament, Team"
              value={permForm.model}
              onChange={(e) => setPermForm({ ...permForm, model: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Eliminar permiso"
        variant="danger"
        loading={confirmLoading}
      />
    </div>
  );
}

