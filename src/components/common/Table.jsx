import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

export default function Table({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No se encontraron registros',
  itemsPerPage = 10,
  onRowClick,
}) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };

  return (
    <div className="table-container" style={{ position: 'relative' }}>
      <div style={{ overflowX: 'auto', minHeight: loading ? '200px' : 'auto' }}>
        <table>
          <thead>
            <tr>
              {columns.map((col, index) => (
                <th
                  key={col.key || index}
                  style={{
                    width: col.width || 'auto',
                    textAlign: col.align || 'left',
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '48px 0' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div className="spinner spinner-lg"></div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                      Cargando datos...
                    </span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '48px 0' }}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '10px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <Inbox size={36} strokeWidth={1.5} />
                    <p style={{ fontSize: '0.92rem' }}>{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((item, rowIdx) => (
                <tr
                  key={item.id || rowIdx}
                  onClick={() => onRowClick && onRowClick(item)}
                  style={{
                    cursor: onRowClick ? 'pointer' : 'default',
                  }}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key || colIdx}
                      style={{
                        textAlign: col.align || 'left',
                      }}
                    >
                      {col.render ? col.render(item, startIndex + rowIdx) : item[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {data.length > itemsPerPage && (
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-secondary)',
            fontSize: '0.84rem',
            color: 'var(--text-secondary)',
          }}
        >
          <div>
            Mostrando <strong style={{ color: '#fff' }}>{startIndex + 1}</strong> a{' '}
            <strong style={{ color: '#fff' }}>
              {Math.min(startIndex + itemsPerPage, data.length)}
            </strong>{' '}
            de <strong style={{ color: '#fff' }}>{data.length}</strong> registros
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              style={{ padding: '4px 8px' }}
              title="Página anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              Página <strong style={{ color: '#fff' }}>{currentPage}</strong> de{' '}
              <strong style={{ color: '#fff' }}>{totalPages}</strong>
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              style={{ padding: '4px 8px' }}
              title="Página siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

