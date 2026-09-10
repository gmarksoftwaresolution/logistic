import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { api } from '../utils/api';
import {
  Calendar,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  RefreshCw,
  AlertCircle,
  Phone,
  FileText
} from 'lucide-react';

interface TransporterReportRow {
  transporterId: string;
  transporterName: string;
  mobileNumber: string;
  transporterCode: string;
  vehicleNumber: string;
  totalAllocated: number;
  completed: number;
  pending: number;
  undelivered: number;
  sellerPickup: number;
  shgDrop: number;
}

interface SummaryData {
  totalTransporters: number;
  totalAllocated: number;
  completed: number;
  pending: number;
  undelivered: number;
}

interface DayEndClosurePageProps {
  onNavigate: (page: string) => void;
}

export const DayEndClosurePage: React.FC<DayEndClosurePageProps> = ({ onNavigate }) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryData>({
    totalTransporters: 0,
    totalAllocated: 0,
    completed: 0,
    pending: 0,
    undelivered: 0,
  });
  const [transporters, setTransporters] = useState<TransporterReportRow[]>([]);

  const fetchReport = async (date: string, search: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.orders.getDayEndClosure(date, search);
      if (res && res.success) {
        setSummary(res.summary || {
          totalTransporters: 0,
          totalAllocated: 0,
          completed: 0,
          pending: 0,
          undelivered: 0,
        });
        setTransporters(res.transporters || []);
      } else {
        throw new Error(res?.message || 'Failed to fetch Day End Closure report');
      }
    } catch (err: any) {
      console.error('Error loading Day End Closure report:', err);
      setError(err.message || 'Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchReport(selectedDate, searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [selectedDate, searchQuery]);

  const handleRefresh = () => {
    fetchReport(selectedDate, searchQuery);
  };

  return (
    <Layout currentPage="day-end-closure" onNavigate={onNavigate}>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-7 h-7 text-[#073318]" />
              Day End Closure
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Daily transporter performance and order closure report
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#073318]/20 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Control Bar: Date Selection & Search */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label htmlFor="report-date" className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 whitespace-nowrap">
              <Calendar className="w-4 h-4 text-[#073318]" />
              Select Date:
            </label>
            <input
              id="report-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#073318] focus:border-transparent transition-all"
            />
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search transporter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#073318] focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Transporters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Transporters</span>
              <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">{summary.totalTransporters}</span>
              <p className="text-xs text-slate-500 mt-0.5">Active on selected date</p>
            </div>
          </div>

          {/* Card 2: Total Allocated */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Allocated</span>
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">{summary.totalAllocated}</span>
              <p className="text-xs text-slate-500 mt-0.5">Assigned orders</p>
            </div>
          </div>

          {/* Card 3: Completed / Delivered */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Completed / Delivered</span>
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-emerald-700">{summary.completed}</span>
              <p className="text-xs text-slate-500 mt-0.5">Successfully fulfilled</p>
            </div>
          </div>

          {/* Card 4: Pending */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pending</span>
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-amber-700">{summary.pending}</span>
              <p className="text-xs text-slate-500 mt-0.5">In-transit / Processing</p>
            </div>
          </div>

          {/* Card 5: Undelivered */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Undelivered</span>
              <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-rose-700">{summary.undelivered}</span>
              <p className="text-xs text-slate-500 mt-0.5">Rejected / Failed</p>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Report Table Container */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Transporter Daily Report</h2>
            <span className="text-xs font-medium text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200">
              Date: {selectedDate}
            </span>
          </div>

          {loading ? (
            <div className="p-8 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : transporters.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">
                {searchQuery ? 'No matching transporters found' : 'No transporter activity found for this date'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `No transporter matching "${searchQuery}" was found for ${selectedDate}.`
                  : `There are no order assignments or transporter records registered for ${selectedDate}.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-4">Transporter</th>
                    <th className="py-3.5 px-4 text-center">Total Allocated</th>
                    <th className="py-3.5 px-4 text-center text-emerald-700">Completed / Delivered</th>
                    <th className="py-3.5 px-4 text-center text-amber-700">Pending</th>
                    <th className="py-3.5 px-4 text-center text-rose-700">Undelivered</th>
                    <th className="py-3.5 px-4 text-center">Seller Pickup</th>
                    <th className="py-3.5 px-4 text-center">SHG Drop</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {transporters.map((row) => (
                    <tr key={row.transporterId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{row.transporterName}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {row.mobileNumber}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {row.transporterCode}
                          </span>
                          {row.vehicleNumber !== 'N/A' && (
                            <>
                              <span>•</span>
                              <span className="text-slate-600">{row.vehicleNumber}</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {row.totalAllocated}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {row.completed}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-amber-700">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          {row.pending}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-rose-700">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          {row.undelivered}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold">
                          {row.sellerPickup}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold">
                          {row.shgDrop}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
