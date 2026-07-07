import type { TableColumn } from "../types";
import { StatusBadge } from "./StatusBadge";

interface DataTableProps<T extends object> {
  columns: readonly TableColumn<T>[];
  rows: T[];
}

export function DataTable<T extends object>({ columns, rows }: DataTableProps<T>) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => {
                const value = row[column.key];
                const display = value == null ? "" : String(value);
                const isStatus = String(column.key).toLowerCase().includes("status");
                return <td key={String(column.key)}>{isStatus ? <StatusBadge value={display} /> : display}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
