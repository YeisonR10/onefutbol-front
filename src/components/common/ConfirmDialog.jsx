import React from 'react';
import Modal from './Modal';
import { AlertTriangle, Trash2, ShieldAlert } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Confirmar acción?',
  message = 'Esta acción no se puede deshacer.',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger', // 'danger' | 'warning' | 'primary'
  loading = false,
}) {
  const getIcon = () => {
    if (variant === 'danger') {
      return (
        <span className="confirm-icon confirm-icon-danger" aria-hidden="true">
          <Trash2 size={22} />
        </span>
      );
    }
    if (variant === 'warning') {
      return (
        <span className="confirm-icon confirm-icon-warning" aria-hidden="true">
          <AlertTriangle size={22} />
        </span>
      );
    }
    return (
      <span className="confirm-icon confirm-icon-primary" aria-hidden="true">
        <ShieldAlert size={22} />
      </span>
    );
  };

  const getConfirmBtnClass = () => {
    if (variant === 'danger') return 'btn btn-danger';
    if (variant === 'warning') return 'btn btn-secondary';
    return 'btn btn-primary';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="460px"
      footer={
        <>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={getConfirmBtnClass()}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                <span>Procesando...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </>
      }
    >
      <div className="confirm-dialog-content">
        {getIcon()}
        <p>{message}</p>
      </div>
    </Modal>
  );
}

