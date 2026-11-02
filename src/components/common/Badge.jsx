import React from 'react';

export default function Badge({
  children,
  active,
  method,
  variant,
  className = '',
  style = {},
}) {
  // Method Badge
  if (method) {
    const upperMethod = method.toUpperCase();
    let badgeClass = 'badge-get';
    if (upperMethod === 'POST') badgeClass = 'badge-post';
    else if (upperMethod === 'PUT') badgeClass = 'badge-put';
    else if (upperMethod === 'PATCH') badgeClass = 'badge-patch';
    else if (upperMethod === 'DELETE') badgeClass = 'badge-delete';

    return (
      <span
        className={`badge ${badgeClass} ${className}`}
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.72rem',
          fontWeight: 700,
          padding: '2px 8px',
          ...style,
        }}
      >
        {upperMethod}
      </span>
    );
  }

  // Active / Inactive Status Badge
  if (typeof active === 'boolean') {
    return (
      <span
        className={`badge ${active ? 'badge-active' : 'badge-inactive'} ${className}`}
        style={style}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: active ? 'var(--accent)' : 'var(--text-muted)',
            display: 'inline-block',
          }}
        />
        {active ? 'Activo' : 'Inactivo'}
      </span>
    );
  }

  // Generic Variant Badge
  let defaultStyle = {
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.15)',
  };

  if (variant === 'success') {
    defaultStyle = {
      background: 'var(--accent-dim)',
      color: 'var(--accent)',
      border: '1px solid rgba(34, 197, 94, 0.3)',
    };
  } else if (variant === 'danger') {
    defaultStyle = {
      background: 'rgba(239, 68, 68, 0.15)',
      color: '#ef4444',
      border: '1px solid rgba(239, 68, 68, 0.3)',
    };
  } else if (variant === 'warning') {
    defaultStyle = {
      background: 'rgba(245, 158, 11, 0.15)',
      color: '#f59e0b',
      border: '1px solid rgba(245, 158, 11, 0.3)',
    };
  } else if (variant === 'info') {
    defaultStyle = {
      background: 'rgba(59, 130, 246, 0.15)',
      color: '#3b82f6',
      border: '1px solid rgba(59, 130, 246, 0.3)',
    };
  }

  return (
    <span
      className={`badge ${className}`}
      style={{ ...defaultStyle, ...style }}
    >
      {children}
    </span>
  );
}

