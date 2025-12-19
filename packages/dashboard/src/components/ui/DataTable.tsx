import { h } from 'preact';
import { useState } from 'preact/hooks';

export interface Column<T> {
  accessor: keyof T | ((row: T) => any);
  header: string;
  cell?: (value: any, row: T) => h.JSX.Element | string | number;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  // Pagination props
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  // Virtual scrolling placeholder
  // TODO: Implement virtual scrolling for large datasets
}

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  column: string | null;
  direction: SortDirection;
}

export function DataTable<T extends Record<string, any>>(props: DataTableProps<T>) {
  const {
    columns,
    data,
    loading = false,
    emptyMessage = 'No data available',
    page = 1,
    pageSize = 10,
    total,
    onPageChange,
  } = props;

  const [sortState, setSortState] = useState<SortState>({
    column: null,
    direction: null,
  });

  const getCellValue = (row: T, column: Column<T>): any => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    return row[column.accessor];
  };

  const handleSort = (column: Column<T>, columnIndex: number) => {
    if (column.sortable === false) return;

    const columnKey = typeof column.accessor === 'string' ? column.accessor : `col_${columnIndex}`;

    let newDirection: SortDirection = 'asc';
    if (sortState.column === columnKey) {
      if (sortState.direction === 'asc') {
        newDirection = 'desc';
      } else if (sortState.direction === 'desc') {
        newDirection = null;
      }
    }

    setSortState({
      column: newDirection ? columnKey : null,
      direction: newDirection,
    });
  };

  // Sort data
  let sortedData = [...data];
  if (sortState.column !== null && sortState.direction) {
    sortedData.sort((a, b) => {
      const columnIndex = columns.findIndex((col, idx) => {
        const key = typeof col.accessor === 'string' ? col.accessor : `col_${idx}`;
        return key === sortState.column;
      });

      if (columnIndex === -1) return 0;

      const column = columns[columnIndex];
      const aValue = getCellValue(a, column);
      const bValue = getCellValue(b, column);

      if (aValue === bValue) return 0;

      const comparison = aValue > bValue ? 1 : -1;
      return sortState.direction === 'asc' ? comparison : -comparison;
    });
  }

  // Calculate pagination
  const totalPages = total ? Math.ceil(total / pageSize) : Math.ceil(sortedData.length / pageSize);
  const isPaginated = onPageChange !== undefined;

  const renderSortIndicator = (column: Column<T>, columnIndex: number) => {
    if (column.sortable === false) return null;

    const columnKey = typeof column.accessor === 'string' ? column.accessor : `col_${columnIndex}`;
    if (sortState.column !== columnKey) {
      return <span style={{ marginLeft: '4px', opacity: 0.3 }}>⇅</span>;
    }

    return (
      <span style={{ marginLeft: '4px' }}>
        {sortState.direction === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  const renderPagination = () => {
    if (!isPaginated) return null;

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px',
        marginTop: '16px',
        padding: '8px',
      }}>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          style={{
            padding: '4px 12px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            cursor: page <= 1 ? 'not-allowed' : 'pointer',
            opacity: page <= 1 ? 0.5 : 1,
          }}
        >
          Previous
        </button>
        <span style={{ color: 'var(--text-secondary)' }}>
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          style={{
            padding: '4px 12px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            cursor: page >= totalPages ? 'not-allowed' : 'pointer',
            opacity: page >= totalPages ? 0.5 : 1,
          }}
        >
          Next
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        padding: '32px',
        textAlign: 'center',
        color: 'var(--text-secondary)',
      }}>
        Loading...
      </div>
    );
  }

  if (sortedData.length === 0) {
    return (
      <div style={{
        padding: '32px',
        textAlign: 'center',
        color: 'var(--text-muted)',
      }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          color: 'var(--text-primary)',
        }}>
          <thead>
            <tr style={{
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
            }}>
              {columns.map((column, idx) => (
                <th
                  key={idx}
                  onClick={() => handleSort(column, idx)}
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 600,
                    cursor: column.sortable !== false ? 'pointer' : 'default',
                    userSelect: 'none',
                  }}
                >
                  {column.header}
                  {renderSortIndicator(column, idx)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                style={{
                  borderBottom: '1px solid var(--border-light)',
                }}
              >
                {columns.map((column, colIdx) => {
                  const value = getCellValue(row, column);
                  const displayValue = column.cell ? column.cell(value, row) : value;

                  return (
                    <td
                      key={colIdx}
                      style={{
                        padding: '12px',
                      }}
                    >
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {renderPagination()}
    </div>
  );
}
