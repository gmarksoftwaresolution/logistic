import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = status?.toLowerCase().trim().replace(/[-_]/g, ' ') || '';

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  if (
    normalized.includes('pending') ||
    normalized.includes('not assigned') ||
    normalized.includes('order placed') ||
    normalized.includes('awaiting')
  ) {
    // Gray/Yellow
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
    dotColor = 'bg-amber-500';
  } else if (
    normalized.includes('accepted') ||
    normalized.includes('assigned') ||
    normalized.includes('shg accepted') ||
    normalized.includes('transporter accepted')
  ) {
    // Blue
    colorClasses = 'bg-blue-50 text-blue-800 border-blue-200';
    dotColor = 'bg-blue-500';
  } else if (
    normalized.includes('picked') ||
    normalized.includes('in transit') ||
    normalized.includes('dispatch') ||
    normalized.includes('packing')
  ) {
    // Orange
    colorClasses = 'bg-orange-50 text-orange-800 border-orange-200';
    dotColor = 'bg-orange-500';
  } else if (
    normalized.includes('stored') ||
    normalized.includes('at hub') ||
    normalized.includes('hub received') ||
    normalized.includes('completed') ||
    normalized.includes('dropped') ||
    normalized.includes('returned') ||
    normalized.includes('active') ||
    normalized.includes('approved') ||
    (normalized.includes('available') && !normalized.includes('not available')) ||
    normalized.includes('barcode') ||
    normalized.includes('ready') ||
    normalized.includes('return drop inventory')
  ) {
    // Green
    colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    dotColor = 'bg-emerald-500';
  } else if (
    normalized.includes('rejected') ||
    normalized.includes('cancelled') ||
    normalized.includes('declined') ||
    normalized.includes('inactive') ||
    normalized.includes('busy') ||
    normalized.includes('unavailable') ||
    normalized.includes('not available')
  ) {
    // Red
    colorClasses = 'bg-red-50 text-red-800 border-red-200';
    dotColor = 'bg-red-500';
  }

  // Display capitalization
  const label = status.replace(/[-_]/g, ' ');

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClasses}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      <span className="capitalize">{label}</span>
    </span>
  );
};
