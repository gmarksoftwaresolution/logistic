import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { TimeAgo } from './TimeAgo';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortKey?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  statusFilterField?: keyof T;
  statusFilterOptions?: string[];
  onRowDoubleClick?: (row: T) => void;
  selectedStatus?: string;
  onStatusChange?: (status: string) => void;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
}

export function getStatusDisplayLabel(status: string): string {
  if (!status) return '';
  const s = status.toLowerCase().trim().replace(/[-_]/g, ' ');
  
  if (s === 'pickup shg accepted' || s === 'shg accepted' || s === 'drop shg accepted' || s === 'accepted') {
    return 'Accepted';
  }
  if (s === 'parcel at shg' || s === 'picked' || s === 'return picked by shg') {
    return 'Picked';
  }
  if (s === 'transporter accepted') {
    return 'Transporter Accepted';
  }
  if (s === 'in transit to hub' || s === 'in transit') {
    return 'In Transit To Hub';
  }
  if (s === 'pending') {
    return 'Pending';
  }
  if (s === 'pending acceptance' || s === 'pending-acceptance' || s === 'shg pending acceptance' || s === 'shg_pending_acceptance') {
    return 'Pending Acceptance';
  }
  if (s === 'hub received' || s === 'pickuphub receive') {
    return 'Pickuphub Receive';
  }
  if (s === 'barcode generated') {
    return 'Barcode Generated';
  }
  
  return s
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function isStatusMatching(rowValue: string, filterValue: string): boolean {
  if (!rowValue) return false;
  const r = rowValue.toLowerCase().trim().replace(/[-_]/g, ' ');
  const f = filterValue.toLowerCase().trim().replace(/[-_]/g, ' ');

  if (r === f) return true;

  const isAccepted = (val: string) => 
    val === 'accepted' || 
    val === 'pickup shg accepted' || 
    val === 'shg accepted' || 
    val === 'drop shg accepted' ||
    val === 'shg_accepted' ||
    val === 'drop_shg_accepted';
    
  if (isAccepted(r) && (f === 'accepted' || f === 'pickup shg accepted')) {
    return true;
  }

  const isPicked = (val: string) =>
    val === 'picked' ||
    val === 'parcel at shg' ||
    val === 'return picked by shg' ||
    val === 'parcel_at_shg';
    
  if (isPicked(r) && (f === 'picked' || f === 'parcel at shg')) {
    return true;
  }

  if ((r === 'transporter accepted' || r === 'transporter_accepted') && f === 'transporter accepted') {
    return true;
  }

  if ((r === 'in transit to hub' || r === 'in transit' || r === 'in_transit_to_hub') && f === 'in transit to hub') {
    return true;
  }

  if (r === 'pending' && f === 'pending') {
    return true;
  }

  const isPendingAcceptance = (val: string) =>
    val === 'pending acceptance' ||
    val === 'pending-acceptance' ||
    val === 'shg pending acceptance' ||
    val === 'shg_pending_acceptance';
    
  if (isPendingAcceptance(r) && f === 'pending acceptance') {
    return true;
  }

  if ((r === 'hub received' || r === 'pickuphub receive') && f === 'pickuphub receive') {
    return true;
  }

  if (r === 'barcode generated' && f === 'barcode generated') {
    return true;
  }

  return false;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchPlaceholder = 'Search...',
  statusFilterField,
  statusFilterOptions,
  onRowDoubleClick,
  selectedStatus: propSelectedStatus,
  onStatusChange,
  selectedDate: propSelectedDate,
  onDateChange,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [internalSelectedStatus, setInternalSelectedStatus] = useState<string>('all');
  const [internalSelectedDate, setInternalSelectedDate] = useState('');

  const selectedStatus = propSelectedStatus !== undefined ? propSelectedStatus : internalSelectedStatus;
  const setSelectedStatus = onStatusChange || setInternalSelectedStatus;

  const selectedDate = propSelectedDate !== undefined ? propSelectedDate : internalSelectedDate;
  const setSelectedDate = onDateChange || setInternalSelectedDate;

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Dynamically enrich columns to include a "Duration" column
  const enrichedColumns = useMemo(() => {
    if (columns.some((col) => col.header === 'Duration')) {
      return columns;
    }

    const durationColumn: Column<T> = {
      header: 'Duration',
      accessor: (row: T) => {
        return (
          <TimeAgo
            sectionEnteredAt={row.sectionEnteredAt}
          />
        );
      }
    };

    // Position Duration column before Order ID (or after checkbox if checkbox is present)
    const hasCheckbox = columns.length > 0 && columns[0].header === '';
    
    const newCols = [...columns];
    if (hasCheckbox) {
      newCols.splice(1, 0, durationColumn);
    } else {
      newCols.unshift(durationColumn);
    }
    return newCols;
  }, [columns]);

  // Extract unique statuses for filtering
  const uniqueStatuses = useMemo(() => {
    if (!statusFilterField) return [];
    const statuses = new Set<string>();
    data.forEach((item) => {
      const val = item[statusFilterField];
      if (val && typeof val === 'string') {
        statuses.add(val);
      }
    });
    return Array.from(statuses);
  }, [data, statusFilterField]);

  // Filter and search (no sorting)
  const filteredData = useMemo(() => {
    let result = [...data];

    // Status Filter (local filtering only if not delegated to parent)
    if (!onStatusChange && statusFilterField && selectedStatus !== 'all') {
      result = result.filter((item) => {
        const val = item[statusFilterField];
        if (val !== undefined && val !== null) {
          return isStatusMatching(String(val), selectedStatus);
        }
        return false;
      });
    }

    // Date Filter (local filtering only if not delegated to parent)
    if (!onDateChange && selectedDate) {
      result = result.filter((item) => {
        return Object.values(item).some((val) => {
          if (val === null || val === undefined) return false;
          if (typeof val === 'string' && val.includes(selectedDate)) {
            return true;
          }
          return false;
        });
      });
    }

    // Search term
    if (searchTerm.trim() !== '') {
      const query = searchTerm.toLowerCase();
      result = result.filter((item) => {
        return Object.values(item).some((val) => {
          if (val === null || val === undefined) return false;
          if (typeof val === 'string' || typeof val === 'number') {
            return String(val).toLowerCase().includes(query);
          }
          if (typeof val === 'object') {
            return JSON.stringify(val).toLowerCase().includes(query);
          }
          return false;
        });
      });
    }

    return result;
  }, [data, searchTerm, selectedStatus, selectedDate, statusFilterField, onStatusChange, onDateChange]);

  // Pagination calculations
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="space-y-5">
      {/* Controls: Search & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-200/80 backdrop-blur-md shadow-sm transition-all duration-300">
        {/* Search */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#073318] transition-colors" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 shadow-sm transition-all duration-200 placeholder:text-slate-400 text-slate-700"
            />
          </div>
          {searchTerm !== '' && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 text-xs font-extrabold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 rounded-xl transition-all duration-200 cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
            >
              ✕ Clear Search
            </button>
          )}
        </div>

        {/* Filters Container */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">Filter Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 shadow-sm cursor-pointer font-extrabold text-slate-700 transition-all duration-200 hover:border-slate-300"
            />
          </div>
          {selectedDate !== '' && (
            <button
              onClick={() => {
                setSelectedDate('');
                setCurrentPage(1);
              }}
              className="px-3.5 py-2 text-xs font-extrabold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 rounded-xl transition-all duration-200 cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
            >
              ✕ Clear Date
            </button>
          )}

          {/* Status Filter */}
          {statusFilterField && (statusFilterOptions || uniqueStatuses.length > 0) && (
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">Filter Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#073318] focus:ring-4 focus:ring-[#073318]/5 shadow-sm cursor-pointer capitalize font-extrabold text-slate-700 transition-all duration-200 hover:border-slate-300"
              >
                <option value="all">All Statuses</option>
                {(statusFilterOptions || uniqueStatuses).map((status) => (
                  <option key={status} value={status}>
                    {statusFilterOptions ? status : getStatusDisplayLabel(status)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {statusFilterField && selectedStatus !== 'all' && (
            <button
              onClick={() => {
                setSelectedStatus('all');
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 text-xs font-extrabold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200/80 rounded-xl transition-all duration-200 cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
            >
              ✕ Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Responsive Table Wrapper */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 text-[#073318] border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                {enrichedColumns.map((col, index) => (
                  <th
                    key={index}
                    className="px-6 py-4 select-none whitespace-nowrap font-extrabold text-[#073318]/80 tracking-wider"
                  >
                    <div className="flex items-center gap-1.5">
                      {col.header}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-750 font-medium">
              {currentItems.length > 0 ? (
                currentItems.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={`hover:bg-slate-50/50 transition-colors duration-150 ${onRowDoubleClick ? 'cursor-pointer select-none' : ''}`}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (
                        target.tagName === 'INPUT' ||
                        target.closest('input') ||
                        target.closest('button') ||
                        target.closest('select') ||
                        target.closest('a')
                      ) {
                        return;
                      }
                      onRowDoubleClick?.(row);
                    }}
                  >
                    {enrichedColumns.map((col, colIndex) => {
                      let cellContent: React.ReactNode;
                      if (typeof col.accessor === 'function') {
                        cellContent = col.accessor(row);
                      } else {
                        const val = row[col.accessor as string];
                        cellContent = val !== undefined && val !== null ? String(val) : '-';
                      }

                      return (
                        <td key={colIndex} className="px-6 py-4 align-middle whitespace-nowrap text-xs text-slate-600">
                          {cellContent}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={enrichedColumns.length} className="px-6 py-12 text-center text-slate-400 font-semibold text-sm">
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="text-xs text-slate-500 font-bold">
              Showing {totalItems === 0 ? 0 : indexOfFirstItem + 1} to{' '}
              {indexOfLastItem > totalItems ? totalItems : indexOfLastItem} of {totalItems} entries
            </span>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {/* Items per page selector */}
              <div className="flex items-center gap-1.5 mr-4">
                <span className="text-xs text-slate-400 font-bold">Rows per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#073318]/50 font-bold text-slate-650"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition-all cursor-pointer hover:border-slate-300 shadow-sm active:scale-95"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-extrabold text-slate-700 px-1">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition-all cursor-pointer hover:border-slate-300 shadow-sm active:scale-95"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
