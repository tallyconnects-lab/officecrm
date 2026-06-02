"use client";

import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total?: number;
  page?: number;
  perPage?: number;
  onPageChange?: (page: number) => void;
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
  actions?: (row: T) => React.ReactNode;
  loading?: boolean;
}

export default function DataTable<T extends Record<string, any>>({
  columns, data, total = 0, page = 1, perPage = 15,
  onPageChange, onSearch, searchPlaceholder = "Search...", actions, loading,
}: DataTableProps<T>) {
  const [searchVal, setSearchVal] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalPages = Math.ceil(total / perPage) || 1;

  const handleSearch = (val: string) => {
    setSearchVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { if (onSearch) onSearch(val); }, 400);
  };

  return (
    <div>
      {onSearch && (
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full sm:w-72 pl-10 pr-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      )}

      <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {columns.map((col) => (
                <th key={col.key} className="text-left px-4 py-3 text-gray-600 font-medium">{col.label}</th>
              ))}
              {actions && <th className="text-left px-4 py-3 text-gray-600 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-12 text-gray-500">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-12 text-gray-500">No records found</td></tr>
            ) : (
              data.map((row, i) => (
                <tr key={row.id ?? i} className="border-b border-gray-200 hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-gray-700">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                  {actions && <td className="px-4 py-3">{actions(row)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">
            Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:text-gray-900 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:text-gray-900 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
