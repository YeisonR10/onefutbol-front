import React, { useState } from 'react';
import { CalendarDays, Camera, Mail, PencilLine, Phone, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { profileApi, usersApi } from '../../api/client';
import Modal from '../common/Modal';
import { useToast } from '../common/Toast';

const emptyProfile = { phone: '', birthDate: '', photo: '' };

export default function ProfileAccess({ placement = 'header' }) {
  const { user, refreshUserProfile } = useAuth();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ ...emptyProfile });
  const [userForm, setUserForm] = useState({ name: user?.name || '', email: user?.email || '' });

  const openProfile = async () => {
    setUserForm({ name: user?.name || '', email: user?.email || '' });
    setIsOpen(true);
    if (!user?.id) return;
    setLoading(true);
    try {
      const result = await profileApi.getByUserId(user.id);
      const current = result?.profile || result?.data || result;
      setProfile(current && (current.id || current.phone || current.birthDate || current.photo) ? current : null);
      setForm({
        phone: current?.phone || '',
        birthDate: current?.birthDate || '',
        photo: current?.photo || '',
      });
    } catch {
      setProfile(null);
      setForm({ ...emptyProfile });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    try {
      await usersApi.update(user.id, { name: userForm.name, email: userForm.email });
      const payload = {
        phone: form.phone,
        birthDate: form.birthDate,
        photo: form.photo || null,
      };
      const updatedProfile = profile
        ? await profileApi.update(user.id, payload)
        : await profileApi.create(user.id, payload);
      setProfile(updatedProfile || payload);
      await refreshUserProfile();
      showToast('Perfil actualizado correctamente', 'success');
      setIsOpen(false);
    } catch (error) {
      showToast(error.message || 'No se pudo actualizar el perfil', 'error');
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.name?.trim()?.charAt(0).toUpperCase() || 'U';

  return (
    <>
      {placement === 'sidebar' ? (
        <button type="button" className="sidebar-user profile-trigger" onClick={openProfile} aria-label="Ver y editar mi perfil">
          <span className="user-avatar" aria-hidden="true">{initials}</span>
          <span className="sidebar-user-copy">
            <strong>{user?.name || 'Administrador'}</strong>
            <small><i aria-hidden="true" /> Mi perfil</small>
          </span>
          <PencilLine className="profile-trigger-icon" size={16} aria-hidden="true" />
        </button>
      ) : (
        <button type="button" className="header-user profile-trigger" onClick={openProfile} aria-label="Ver y editar mi perfil">
          <span className="user-avatar" aria-hidden="true">{initials}</span>
          <span className="header-user-copy">
            <strong>{user?.name || 'Administrador'}</strong>
            <small>{user?.email || 'admin@onesports.com'}</small>
          </span>
          <PencilLine className="profile-trigger-icon" size={15} aria-hidden="true" />
        </button>
      )}

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Mi perfil"
        maxWidth="620px"
        footer={(
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsOpen(false)} disabled={saving}>Cancelar</button>
            <button type="submit" form="account-profile-form" className="btn btn-primary" disabled={saving || loading || !user?.id}>
              {saving ? <><span className="spinner" /><span>Guardando...</span></> : 'Guardar cambios'}
            </button>
          </>
        )}
      >
        <div className="profile-modal-intro">
          <span className="profile-modal-avatar" aria-hidden="true">{profile?.photo ? <img src={profile.photo} alt="" /> : initials}</span>
          <div>
            <strong>{user?.name || 'Administrador'}</strong>
            <span>{user?.email || 'Correo no disponible'}</span>
            <small>Administra tu información personal</small>
          </div>
        </div>
        {loading ? (
          <div className="profile-loading" aria-live="polite"><span className="spinner spinner-lg" /><span>Cargando perfil...</span></div>
        ) : (
          <form id="account-profile-form" className="profile-form" onSubmit={handleSave}>
            <div className="profile-form-section">
              <span className="profile-section-title"><UserRound size={16} /> Datos de cuenta</span>
              <div className="profile-form-grid">
                <div><label htmlFor={`profile-name-${placement}`}>Nombre</label><input id={`profile-name-${placement}`} value={userForm.name} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} required /></div>
                <div><label htmlFor={`profile-email-${placement}`}>Correo electrónico</label><div className="profile-input-icon"><Mail size={16} /><input id={`profile-email-${placement}`} type="email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} required /></div></div>
              </div>
            </div>
            <div className="profile-form-section">
              <span className="profile-section-title"><PencilLine size={16} /> Información personal</span>
              <div className="profile-form-grid">
                <div><label htmlFor={`profile-phone-${placement}`}>Teléfono</label><div className="profile-input-icon"><Phone size={16} /><input id={`profile-phone-${placement}`} type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/\D/g, '') })} placeholder="Añadir teléfono" /></div></div>
                <div><label htmlFor={`profile-birth-${placement}`}>Fecha de nacimiento</label><div className="profile-input-icon"><CalendarDays size={16} /><input id={`profile-birth-${placement}`} type="date" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} /></div></div>
                <div className="profile-photo-field"><label htmlFor={`profile-photo-${placement}`}>Foto de perfil · URL</label><div className="profile-input-icon"><Camera size={16} /><input id={`profile-photo-${placement}`} type="url" value={form.photo} onChange={(event) => setForm({ ...form, photo: event.target.value })} placeholder="https://..." /></div></div>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
