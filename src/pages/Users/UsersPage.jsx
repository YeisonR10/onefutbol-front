import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Power,
  X,
  Phone,
  Calendar,
  Image,
  Shield,
  PlusCircle,
  Monitor,
  Check,
} from 'lucide-react';
import {
  usersApi,
  profileApi,
  userRolesApi,
  rolesApi,
  sessionsApi,
} from '../../api/client';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useToast } from '../../components/common/Toast';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | ACTIVE | INACTIVE

  // Drawer / Detail Side Panel State
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [userSessions, setUserSessions] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [selectedRoleIdToAssign, setSelectedRoleIdToAssign] = useState('');
  const [loadingDetail, setLoadingDetail] = useState(false);

  // User Create / Edit Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [currentUserForm, setCurrentUserForm] = useState({
    id: null,
    name: '',
    email: '',
    password: '',
    active: true,
  });
  const [savingUser, setSavingUser] = useState(false);

  // Profile Create / Edit Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    phone: '',
    birthDate: '',
    photo: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger',
    confirmText: 'Confirmar',
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const { showToast } = useToast();

  // Load all users & available roles
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await usersApi.getAll();
      setUsers(data || []);
    } catch (err) {
      showToast(err.message || 'Error al obtener usuarios', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableRoles = async () => {
    try {
      const roles = await rolesApi.getAll();
      setAvailableRoles(roles || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAvailableRoles();
  }, []);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase());

      if (statusFilter === 'ACTIVE') return matchesSearch && u.active;
      if (statusFilter === 'INACTIVE') return matchesSearch && !u.active;
      return matchesSearch;
    });
  }, [users, searchQuery, statusFilter]);

  // Open User Detail Drawer & fetch user profile + roles + sessions
  const handleOpenDetail = async (user) => {
    setSelectedUser(user);
    setLoadingDetail(true);
    try {
      // Fetch details in parallel
      const [detailRes, profileRes, rolesRes, sessionsRes] = await Promise.allSettled([
        usersApi.getDetail(user.id),
        profileApi.getByUserId(user.id),
        userRolesApi.getByUserId(user.id),
        sessionsApi.getByUserId(user.id),
      ]);

      if (detailRes.status === 'fulfilled') {
        setSelectedUserDetail(detailRes.value);
        if (detailRes.value?.profile) {
          setUserProfile(detailRes.value.profile);
        }
      }

      if (profileRes.status === 'fulfilled' && profileRes.value) {
        setUserProfile(profileRes.value);
      } else if (detailRes.status !== 'fulfilled' || !detailRes.value?.profile) {
        setUserProfile(null);
      }

      if (rolesRes.status === 'fulfilled') {
        setUserRoles(rolesRes.value || []);
      } else {
        setUserRoles([]);
      }

      if (sessionsRes.status === 'fulfilled') {
        setUserSessions(sessionsRes.value || []);
      } else {
        setUserSessions([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Close User Detail Drawer
  const handleCloseDetail = () => {
    setSelectedUser(null);
    setSelectedUserDetail(null);
    setUserProfile(null);
    setUserRoles([]);
    setUserSessions([]);
  };

  // Open Create User Modal
  const handleOpenCreateUser = () => {
    setIsEditingUser(false);
    setCurrentUserForm({
      id: null,
      name: '',
      email: '',
      password: '',
      active: true,
    });
    setIsUserModalOpen(true);
  };

  // Open Edit User Modal
  const handleOpenEditUser = (user) => {
    setIsEditingUser(true);
    setCurrentUserForm({
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      password: '', // Blank unless modifying
      active: user.active ?? true,
    });
    setIsUserModalOpen(true);
  };

  // Save User (Create or Update)
  const handleSaveUser = async (e) => {
    e.preventDefault();
    setSavingUser(true);
    try {
      if (isEditingUser) {
        const payload = {
          name: currentUserForm.name,
          email: currentUserForm.email,
        };
        if (currentUserForm.password?.trim()) {
          payload.password = currentUserForm.password.trim();
        }
        await usersApi.update(currentUserForm.id, payload);
        showToast('Usuario actualizado correctamente', 'success');
      } else {
        const payload = {
          name: currentUserForm.name,
          email: currentUserForm.email,
          password: currentUserForm.password,
          active: currentUserForm.active,
        };
        await usersApi.create(payload);
        showToast('Usuario registrado con éxito', 'success');
      }

      setIsUserModalOpen(false);
      fetchUsers();
      if (selectedUser && selectedUser.id === currentUserForm.id) {
        handleOpenDetail({ ...selectedUser, name: currentUserForm.name, email: currentUserForm.email });
      }
    } catch (err) {
      showToast(err.message || 'Error al guardar usuario', 'error');
    } finally {
      setSavingUser(false);
    }
  };

  // Toggle user activation state (PATCH activate / deactivate)
  const handleToggleActive = (user) => {
    const isActivating = !user.active;
    setConfirmDialog({
      isOpen: true,
      title: isActivating ? 'Activar Usuario' : 'Desactivar Usuario',
      message: isActivating
        ? `¿Desea reactivar la cuenta de "${user.name}"? Podrá volver a acceder al sistema.`
        : `¿Desea desactivar al usuario "${user.name}"? No podrá iniciar sesión mientras esté inactivo.`,
      confirmText: isActivating ? 'Activar cuenta' : 'Desactivar cuenta',
      variant: isActivating ? 'primary' : 'warning',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          if (isActivating) {
            await usersApi.activate(user.id);
            showToast(`Usuario "${user.name}" activado`, 'success');
          } else {
            await usersApi.deactivate(user.id);
            showToast(`Usuario "${user.name}" desactivado`, 'warning');
          }
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          fetchUsers();
          if (selectedUser && selectedUser.id === user.id) {
            setSelectedUser((prev) => ({ ...prev, active: isActivating }));
          }
        } catch (err) {
          showToast(err.message || 'Error al cambiar estado', 'error');
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  };

  // Delete User
  const handleDeleteUser = (user) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Usuario',
      message: `¿Está seguro de eliminar definitivamente a "${user.name}" (${user.email})? Se eliminarán su perfil y roles asignados.`,
      confirmText: 'Eliminar definitivamente',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await usersApi.delete(user.id);
          showToast(`Usuario "${user.name}" eliminado`, 'success');
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          if (selectedUser && selectedUser.id === user.id) {
            handleCloseDetail();
          }
          fetchUsers();
        } catch (err) {
          showToast(err.message || 'Error al eliminar usuario', 'error');
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  };

  // Profile Management inside drawer
  const handleOpenProfileModal = () => {
    if (userProfile) {
      setProfileForm({
        phone: userProfile.phone || '',
        birthDate: userProfile.birthDate || '',
        photo: userProfile.photo || '',
      });
    } else {
      setProfileForm({
        phone: '',
        birthDate: '',
        photo: '',
      });
    }
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSavingProfile(true);
    try {
      const payload = {
        phone: profileForm.phone,
        birthDate: profileForm.birthDate,
        photo: profileForm.photo || null,
      };

      let updated;
      if (userProfile && (userProfile.id || userProfile.phone)) {
        updated = await profileApi.update(selectedUser.id, payload);
        showToast('Perfil actualizado con éxito', 'success');
      } else {
        updated = await profileApi.create(selectedUser.id, payload);
        showToast('Perfil creado con éxito', 'success');
      }

      setUserProfile(updated || payload);
      setIsProfileModalOpen(false);
    } catch (err) {
      showToast(err.message || 'Error al guardar perfil', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteProfile = () => {
    if (!selectedUser) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Perfil',
      message: `¿Desea borrar la información de perfil (teléfono, fecha nacimiento, foto) del usuario "${selectedUser.name}"?`,
      confirmText: 'Eliminar perfil',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await profileApi.delete(selectedUser.id);
          showToast('Perfil eliminado', 'success');
          setUserProfile(null);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch (err) {
          showToast(err.message || 'Error al eliminar perfil', 'error');
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  };

  // User Role Management inside drawer
  const handleAssignRole = async () => {
    if (!selectedRoleIdToAssign || !selectedUser) return;
    try {
      await userRolesApi.assign({
        userId: selectedUser.id,
        roleId: Number(selectedRoleIdToAssign),
      });
      showToast('Rol asignado correctamente', 'success');
      setSelectedRoleIdToAssign('');
      const rolesRes = await userRolesApi.getByUserId(selectedUser.id);
      setUserRoles(rolesRes || []);
    } catch (err) {
      showToast(err.message || 'Error al asignar rol', 'error');
    }
  };

  const handleRemoveRole = (roleItem) => {
    const roleId = roleItem.role?.id || roleItem.roleId || roleItem.id;
    const roleName = roleItem.role?.name || `Rol #${roleId}`;

    setConfirmDialog({
      isOpen: true,
      title: 'Quitar Rol de Usuario',
      message: `¿Desea remover el rol "${roleName}" para el usuario "${selectedUser.name}"?`,
      confirmText: 'Quitar rol',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await userRolesApi.remove(selectedUser.id, roleId);
          showToast(`Rol "${roleName}" removido`, 'success');
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          const rolesRes = await userRolesApi.getByUserId(selectedUser.id);
          setUserRoles(rolesRes || []);
        } catch (err) {
          showToast(err.message || 'Error al quitar rol', 'error');
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  };

  // Table columns definition
  const columns = [
    {
      key: 'name',
      label: 'Nombre y Cuenta',
      render: (u) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#1a2744',
              border: '1px solid var(--border)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.85rem',
            }}
          >
            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.92rem' }}>
              {u.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              ID: #{u.id}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Correo Electrónico',
      render: (u) => (
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          {u.email}
        </span>
      ),
    },
    {
      key: 'active',
      label: 'Estado',
      width: '130px',
      render: (u) => <Badge active={u.active} />,
    },
    {
      key: 'actions',
      label: 'Acciones',
      width: '190px',
      align: 'right',
      render: (u) => (
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="btn-icon"
            onClick={() => handleOpenDetail(u)}
            title="Ver detalle y perfil"
          >
            <Eye size={17} color="#3b82f6" />
          </button>

          <button
            type="button"
            className="btn-icon"
            onClick={() => handleOpenEditUser(u)}
            title="Editar usuario"
          >
            <Edit2 size={17} color="#f59e0b" />
          </button>

          <button
            type="button"
            className="btn-icon"
            onClick={() => handleToggleActive(u)}
            title={u.active ? 'Desactivar usuario' : 'Activar usuario'}
          >
            <Power size={17} color={u.active ? '#22c55e' : '#94a3b8'} />
          </button>

          <button
            type="button"
            className="btn-icon"
            onClick={() => handleDeleteUser(u)}
            title="Eliminar usuario"
          >
            <Trash2 size={17} color="#ef4444" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top action bar: Search, filters & New User button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '600px' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Buscar por nombre o correo electrónico..."
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

          {/* Status Filter */}
          <div style={{ minWidth: '150px' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '9px 12px' }}
            >
              <option value="ALL">Todos ({users.length})</option>
              <option value="ACTIVE">
                Activos ({users.filter((u) => u.active).length})
              </option>
              <option value="INACTIVE">
                Inactivos ({users.filter((u) => !u.active).length})
              </option>
            </select>
          </div>
        </div>

        {/* Create User Button */}
        <button
          className="btn btn-primary"
          onClick={handleOpenCreateUser}
          style={{ padding: '10px 18px' }}
        >
          <UserPlus size={18} />
          <span>Registrar Usuario</span>
        </button>
      </div>

      {/* Main Content Area: Table + Side Drawer (if open) */}
      <div style={{ display: 'flex', gap: '24px', position: 'relative' }}>
        {/* Table view */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Table
            columns={columns}
            data={filteredUsers}
            loading={loading}
            emptyMessage="No se encontraron usuarios que coincidan con la búsqueda."
            itemsPerPage={8}
            onRowClick={(user) => handleOpenDetail(user)}
          />
        </div>

        {/* User Detail Side Drawer */}
        {selectedUser && (
          <div
            className="animate-slide-right"
            style={{
              width: '450px',
              backgroundColor: '#111827',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              maxHeight: 'calc(100vh - 120px)',
              overflowY: 'auto',
              flexShrink: 0,
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-dim)',
                    border: '2px solid rgba(34, 197, 94, 0.4)',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.2rem',
                    overflow: 'hidden',
                  }}
                >
                  {userProfile?.photo ? (
                    <img
                      src={userProfile.photo}
                      alt={selectedUser.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : selectedUser.name ? (
                    selectedUser.name.charAt(0).toUpperCase()
                  ) : (
                    'U'
                  )}
                </div>

                <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#ffffff', fontWeight: 700 }}>
                    {selectedUser.name}
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {selectedUser.email}
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <Badge active={selectedUser.active} />
                  </div>
                </div>
              </div>

              <button
                className="btn-icon"
                onClick={handleCloseDetail}
                title="Cerrar panel"
              >
                <X size={20} />
              </button>
            </div>

            {loadingDetail ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div className="spinner"></div>
                <p style={{ marginTop: '10px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Cargando detalle de cuenta...
                </p>
              </div>
            ) : (
              <>
                {/* Profile Section */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                      Perfil Personal
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={handleOpenProfileModal}
                        style={{ fontSize: '0.76rem', padding: '4px 10px' }}
                      >
                        {userProfile ? 'Editar' : 'Completar perfil'}
                      </button>
                      {userProfile && (
                        <button
                          className="btn btn-danger-ghost btn-sm"
                          onClick={handleDeleteProfile}
                          style={{ fontSize: '0.76rem', padding: '4px 8px' }}
                          title="Eliminar datos de perfil"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {userProfile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.84rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                        <Phone size={15} color="var(--accent)" />
                        <span>Teléfono:</span>
                        <strong style={{ color: '#fff', marginLeft: 'auto' }}>
                          {userProfile.phone || 'No registrado'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                        <Calendar size={15} color="var(--accent)" />
                        <span>Nacimiento:</span>
                        <strong style={{ color: '#fff', marginLeft: 'auto' }}>
                          {userProfile.birthDate || 'No registrado'}
                        </strong>
                      </div>
                      {userProfile.photo && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                          <Image size={15} color="var(--accent)" />
                          <span>Foto URL:</span>
                          <span
                            style={{
                              color: 'var(--info)',
                              marginLeft: 'auto',
                              maxWidth: '180px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={userProfile.photo}
                          >
                            {userProfile.photo}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                      El usuario aún no tiene datos de perfil registrados.
                    </div>
                  )}
                </div>

                {/* Assigned Roles Section */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '16px',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
                    Roles Asignados ({userRoles.length})
                  </div>

                  {/* Add role control */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                    <select
                      value={selectedRoleIdToAssign}
                      onChange={(e) => setSelectedRoleIdToAssign(e.target.value)}
                      style={{ fontSize: '0.82rem', padding: '6px 10px', flex: 1 }}
                    >
                      <option value="">Seleccione rol a asignar...</option>
                      {availableRoles
                        .filter(
                          (ar) =>
                            !userRoles.some(
                              (ur) =>
                                (ur.role && ur.role.id === ar.id) ||
                                ur.roleId === ar.id ||
                                ur.id === ar.id
                            )
                        )
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                    </select>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleAssignRole}
                      disabled={!selectedRoleIdToAssign}
                      style={{ padding: '6px 12px' }}
                    >
                      <PlusCircle size={15} />
                      <span>Asignar</span>
                    </button>
                  </div>

                  {userRoles.length === 0 ? (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                      Sin roles asignados a esta cuenta.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {userRoles.map((ur, idx) => {
                        const roleObj = ur.role || ur;
                        return (
                          <div
                            key={ur.id || idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              backgroundColor: '#111827',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Shield size={15} color="var(--accent)" />
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
                                {roleObj.name || `Rol #${ur.roleId}`}
                              </span>
                            </div>

                            <button
                              className="btn-icon"
                              onClick={() => handleRemoveRole(ur)}
                              style={{ padding: '4px' }}
                              title="Remover rol"
                            >
                              <Trash2 size={14} color="#ef4444" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Sessions Section */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '16px',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
                    Historial de Sesiones ({userSessions.length})
                  </div>

                  {userSessions.length === 0 ? (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                      No se registran sesiones activas para este usuario.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {userSessions.map((session, sIdx) => (
                        <div
                          key={session.id || sIdx}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#111827',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff' }}>
                              <Monitor size={14} color="var(--info)" />
                              <strong>{session.device || 'Dispositivo desconocido'}</strong>
                            </div>
                            <span style={{ color: 'var(--accent)', fontSize: '0.72rem' }}>
                              {session.status || 'Activa'}
                            </span>
                          </div>
                          <div style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.74rem' }}>
                            IP: {session.ipAddress || '127.0.0.1'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal: Create or Edit User */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={isEditingUser ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsUserModalOpen(false)}
              disabled={savingUser}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveUser}
              disabled={savingUser}
            >
              {savingUser ? (
                <>
                  <span className="spinner" style={{ borderTopColor: '#000' }}></span>
                  <span>Guardando...</span>
                </>
              ) : isEditingUser ? (
                'Guardar Cambios'
              ) : (
                'Crear Usuario'
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="user-form-name">Nombre Completo *</label>
            <input
              id="user-form-name"
              type="text"
              required
              placeholder="ej. Carlos Santana"
              value={currentUserForm.name}
              onChange={(e) =>
                setCurrentUserForm({ ...currentUserForm, name: e.target.value })
              }
            />
          </div>

          <div>
            <label htmlFor="user-form-email">Correo Electrónico *</label>
            <input
              id="user-form-email"
              type="email"
              required
              placeholder="ej. usuario@onesports.com"
              value={currentUserForm.email}
              onChange={(e) =>
                setCurrentUserForm({ ...currentUserForm, email: e.target.value })
              }
            />
          </div>

          <div>
            <label htmlFor="user-form-password">
              Contraseña {isEditingUser ? '(Dejar en blanco para no modificar)' : '*'}
            </label>
            <input
              id="user-form-password"
              type="password"
              required={!isEditingUser}
              placeholder="Mínimo 8 car., Mayúscula, Minúscula, Número y Especial"
              value={currentUserForm.password}
              onChange={(e) =>
                setCurrentUserForm({ ...currentUserForm, password: e.target.value })
              }
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Debe contener mayúscula, minúscula, número y símbolo (@$!%*?#&).
            </span>
          </div>

          {!isEditingUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
              <input
                id="user-form-active"
                type="checkbox"
                checked={currentUserForm.active}
                onChange={(e) =>
                  setCurrentUserForm({ ...currentUserForm, active: e.target.checked })
                }
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
              />
              <label htmlFor="user-form-active" style={{ margin: 0, cursor: 'pointer', color: '#fff' }}>
                Habilitar usuario como Activo inmediatamente
              </label>
            </div>
          )}
        </form>
      </Modal>

      {/* Modal: Create or Edit User Profile */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title={userProfile ? 'Editar Información de Perfil' : 'Completar Perfil de Usuario'}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsProfileModalOpen(false)}
              disabled={savingProfile}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveProfile}
              disabled={savingProfile}
            >
              {savingProfile ? (
                <>
                  <span className="spinner" style={{ borderTopColor: '#000' }}></span>
                  <span>Guardando...</span>
                </>
              ) : (
                'Guardar Perfil'
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="profile-phone">Teléfono (7 a 15 dígitos numéricos) *</label>
            <input
              id="profile-phone"
              type="tel"
              required
              pattern="^[0-9]{7,15}$"
              placeholder="ej. 3105551234"
              value={profileForm.phone}
              onChange={(e) =>
                setProfileForm({ ...profileForm, phone: e.target.value.replace(/\D/g, '') })
              }
            />
          </div>

          <div>
            <label htmlFor="profile-birthdate">Fecha de Nacimiento *</label>
            <input
              id="profile-birthdate"
              type="date"
              required
              max={new Date().toISOString().split('T')[0]}
              value={profileForm.birthDate}
              onChange={(e) =>
                setProfileForm({ ...profileForm, birthDate: e.target.value })
              }
            />
          </div>

          <div>
            <label htmlFor="profile-photo">URL de Fotografía (Opcional)</label>
            <input
              id="profile-photo"
              type="url"
              placeholder="https://ejemplo.com/fotos/avatar.jpg"
              value={profileForm.photo}
              onChange={(e) =>
                setProfileForm({ ...profileForm, photo: e.target.value })
              }
            />
          </div>
        </form>
      </Modal>

      {/* Reusable Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
        loading={confirmLoading}
      />
    </div>
  );
}

