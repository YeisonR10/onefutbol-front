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
        className={`badge badge-method ${badgeClass} ${className}`}
        style={style}
      >
        {upperMethod}
      </span>
    );
  }

  // Active / Inactive Status Badge
  if (typeof active === 'boolean') {
    return (
      <span className={`badge ${active ? 'badge-active' : 'badge-inactive'} ${className}`} style={style}>
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
  const variantClass = variant ? `badge-${variant}` : 'badge-neutral';

  return (
    <span className={`badge ${variantClass} ${className}`} style={style}>
      {children}
    </span>
  );
}

