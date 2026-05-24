import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  title?: string;
  bare?: boolean;
  getRowKey: (row: T) => string | number;
  selectedKey?: string | number;
  onRowClick?: (row: T) => void;
}

export default function DataTable<T>({
  columns,
  data,
  title,
  bare = false,
  getRowKey,
  selectedKey,
  onRowClick,
}: DataTableProps<T>) {
  const table = (
    <div className="data-table-wrap">
      <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>
                  {col.header}
                  {col.sortable && <ChevronDown size={12} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const key = getRowKey(row);
              return (
                <tr
                  key={key}
                  className={selectedKey === key ? 'row--selected' : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={onRowClick ? { cursor: 'pointer' } : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={col.className}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
    </div>
  );

  if (bare) return table;

  return (
    <div className="card">
      {title && (
        <div className="card__header">
          <h2 className="card__title">{title}</h2>
        </div>
      )}
      <div className="card__body">{table}</div>
    </div>
  );
}

export type { Column };
