import React from 'react';

interface StatusBadgeProps {
  status: string;
}

// Exact-match color map for all canonical lifecycle status values.
// Added to ensure every canonical status gets the correct color without
// relying on substring matching which can produce false positives.
const STATUS_MAP: Record<string, { colorClasses: string; dotColor: string }> = {
  // Phase 1 - Order Creation
  ORDER_PLACED:               { colorClasses: 'bg-amber-50 text-amber-800 border-amber-200',    dotColor: 'bg-amber-500' },
  PENDING_PICKUP:             { colorClasses: 'bg-amber-50 text-amber-800 border-amber-200',    dotColor: 'bg-amber-500' },

  // Phase 2 - Pickup Assignment
  PICKUP_ASSIGNED:            { colorClasses: 'bg-blue-50 text-blue-800 border-blue-200',       dotColor: 'bg-blue-500' },
  PICKUP_SHG_ACCEPTED:        { colorClasses: 'bg-blue-50 text-blue-800 border-blue-200',       dotColor: 'bg-blue-500' },
  SHG_PICKUP_DECLINED:        { colorClasses: 'bg-red-50 text-red-800 border-red-200',          dotColor: 'bg-red-500' },
  PICKUP_SHG_PENDING:         { colorClasses: 'bg-amber-50 text-amber-800 border-amber-200',    dotColor: 'bg-amber-500' },

  // Phase 3 - Parcel Collection from Seller
  PARCEL_AT_SHG:              { colorClasses: 'bg-orange-50 text-orange-800 border-orange-200', dotColor: 'bg-orange-500' },

  // Phase 4 - Transporter Pickup from SHG
  TRANSPORTER_ACCEPTED:       { colorClasses: 'bg-blue-50 text-blue-800 border-blue-200',       dotColor: 'bg-blue-500' },
  PICKUP_TRANSPORTER_ACCEPTED:{ colorClasses: 'bg-blue-50 text-blue-800 border-blue-200',       dotColor: 'bg-blue-500' },
  TRANSPORTER_DECLINED:       { colorClasses: 'bg-red-50 text-red-800 border-red-200',          dotColor: 'bg-red-500' },
  IN_TRANSIT_TO_HUB:          { colorClasses: 'bg-orange-50 text-orange-800 border-orange-200', dotColor: 'bg-orange-500' },
  PARCEL_AT_TRANSPORTER:      { colorClasses: 'bg-orange-50 text-orange-800 border-orange-200', dotColor: 'bg-orange-500' },

  // Phase 5 - Hub Receive and Dispatch
  AT_HUB:                     { colorClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200', dotColor: 'bg-emerald-500' },
  PARCEL_AT_HUB:              { colorClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200', dotColor: 'bg-emerald-500' },
  RETURN_PARCEL_AT_HUB:       { colorClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200', dotColor: 'bg-emerald-500' },
  HUB_RECEIVED:               { colorClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200', dotColor: 'bg-emerald-500' },
  PARCEL_AT_GMU:              { colorClasses: 'bg-orange-50 text-orange-800 border-orange-200', dotColor: 'bg-orange-500' },
  RETURN_PARCEL_AT_GMU:       { colorClasses: 'bg-orange-50 text-orange-800 border-orange-200', dotColor: 'bg-orange-500' },
  BARCODE_GENERATED:          { colorClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200', dotColor: 'bg-emerald-500' },
  STORED:                     { colorClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200', dotColor: 'bg-emerald-500' },
  DROP_ASSIGNED:              { colorClasses: 'bg-blue-50 text-blue-800 border-blue-200',       dotColor: 'bg-blue-500' },
  DISPATCHED:                 { colorClasses: 'bg-blue-50 text-blue-800 border-blue-200',       dotColor: 'bg-blue-500' },
  PENDING_DROP:               { colorClasses: 'bg-amber-50 text-amber-800 border-amber-200',    dotColor: 'bg-amber-500' },
  DROP_SHG_PENDING:           { colorClasses: 'bg-amber-50 text-amber-800 border-amber-200',    dotColor: 'bg-amber-500' },

  // Phase 6 - Drop Leg
  DROP_TRANSPORTER_ACCEPTED:  { colorClasses: 'bg-blue-50 text-blue-800 border-blue-200',       dotColor: 'bg-blue-500' },
  IN_TRANSIT_TO_DROP_SHG:     { colorClasses: 'bg-orange-50 text-orange-800 border-orange-200', dotColor: 'bg-orange-500' },
  IN_TRANSIT_TO_SHG:          { colorClasses: 'bg-orange-50 text-orange-800 border-orange-200', dotColor: 'bg-orange-500' },
  PARCEL_AT_DROP_SHG:         { colorClasses: 'bg-orange-50 text-orange-800 border-orange-200', dotColor: 'bg-orange-500' },

  // Phase 7 - Last Mile Delivery
  DROP_SHG_ACCEPTED:          { colorClasses: 'bg-blue-50 text-blue-800 border-blue-200',       dotColor: 'bg-blue-500' },
  DELIVERED:                  { colorClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200', dotColor: 'bg-emerald-500' },
  DELVIERED_TO_BUYER:         { colorClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200', dotColor: 'bg-emerald-500' },
  DELIVERED_TO_BUYER:         { colorClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200', dotColor: 'bg-emerald-500' },
  PARCEL_AT_BUYER:            { colorClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200', dotColor: 'bg-emerald-500' },

  // Phase 8 - Order Completion
  COMPLETED:                  { colorClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200', dotColor: 'bg-emerald-500' },
  RETURN_COMPLETED:           { colorClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200', dotColor: 'bg-emerald-500' },

  // Exception Statuses
  ON_HOLD:                    { colorClasses: 'bg-amber-50 text-amber-800 border-amber-200',    dotColor: 'bg-amber-500' },
  TRANSPORTER_RETURN:         { colorClasses: 'bg-amber-50 text-amber-800 border-amber-200',    dotColor: 'bg-amber-500' },
  REASSIGNED:                 { colorClasses: 'bg-purple-50 text-purple-800 border-purple-200', dotColor: 'bg-purple-500' },
  RESCHEDULED:                { colorClasses: 'bg-purple-50 text-purple-800 border-purple-200', dotColor: 'bg-purple-500' },
  CANCELLED:                  { colorClasses: 'bg-red-50 text-red-800 border-red-200',          dotColor: 'bg-red-500' },
  SLA_BREACHED:               { colorClasses: 'bg-red-50 text-red-800 border-red-200',          dotColor: 'bg-red-500' },

  // Return sub-statuses
  RETURN_SHG_ASSIGNED:        { colorClasses: 'bg-blue-50 text-blue-800 border-blue-200',       dotColor: 'bg-blue-500' },
  RETURN_PARCEL_AT_SHG:       { colorClasses: 'bg-orange-50 text-orange-800 border-orange-200', dotColor: 'bg-orange-500' },
  RETURN_TRANSPORTER_PENDING: { colorClasses: 'bg-amber-50 text-amber-800 border-amber-200',    dotColor: 'bg-amber-500' },
  RETURN_TRANSPORTER_ACCEPTED:{ colorClasses: 'bg-blue-50 text-blue-800 border-blue-200',       dotColor: 'bg-blue-500' },
  RETURN_IN_TRANSIT_TO_GMU:   { colorClasses: 'bg-orange-50 text-orange-800 border-orange-200', dotColor: 'bg-orange-500' },
  RETURN_IN_TRANSIT_TO_HUB:   { colorClasses: 'bg-orange-50 text-orange-800 border-orange-200', dotColor: 'bg-orange-500' },
  RETURN_SHG_PENDING:         { colorClasses: 'bg-amber-50 text-amber-800 border-amber-200',    dotColor: 'bg-amber-500' },
  RETURN_SHG_ACCEPTED:        { colorClasses: 'bg-blue-50 text-blue-800 border-blue-200',       dotColor: 'bg-blue-500' },
  TRANSPORTER_RETURN_PENDING: { colorClasses: 'bg-amber-50 text-amber-800 border-amber-200',    dotColor: 'bg-amber-500' },
  TRANSPORTER_RETURN_COMPLETED:{ colorClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200', dotColor: 'bg-emerald-500' },
  BUYER_RETURN_COMPLETED:     { colorClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200', dotColor: 'bg-emerald-500' },
  INVENTORY_TRANSPORTER_RETURN:{ colorClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200', dotColor: 'bg-emerald-500' },
  INVENTORY_BUYER_RETURN:     { colorClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200', dotColor: 'bg-emerald-500' },

  // Partner statuses
  ACCEPTED:    { colorClasses: 'bg-blue-50 text-blue-800 border-blue-200',       dotColor: 'bg-blue-500' },
  PENDING:     { colorClasses: 'bg-amber-50 text-amber-800 border-amber-200',    dotColor: 'bg-amber-500' },
  REJECTED:    { colorClasses: 'bg-red-50 text-red-800 border-red-200',          dotColor: 'bg-red-500' },
  PICKED:      { colorClasses: 'bg-orange-50 text-orange-800 border-orange-200', dotColor: 'bg-orange-500' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-slate-100 text-slate-700 border-slate-200">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        <span>—</span>
      </span>
    );
  }

  // 1. Exact-match lookup using the canonical status value from backend
  const key = status.toUpperCase().trim().replace(/[\s-]/g, '_');
  const canonical = STATUS_MAP[key];
  if (canonical) {
    let label = status.toLowerCase().replace(/[-_]/g, ' ');
    if (key === 'DELIVERED_TO_BUYER' || key === 'DELVIERED_TO_BUYER' || key === 'PARCEL_AT_BUYER') {
      label = 'delivered';
    }
    if (key === 'PARCEL_AT_GMU') {
      label = 'parcel at hub';
    }
    if (key === 'RETURN_PARCEL_AT_GMU') {
      label = 'return parcel at hub';
    }
    if (key === 'HUB_RECEIVED' || key === 'AT_HUB' || key === 'PARCEL_AT_HUB') {
      label = 'parcel at hub';
    }
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${canonical.colorClasses}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${canonical.dotColor}`} />
        <span className="capitalize">{label}</span>
      </span>
    );
  }

  // 2. Keyword-based fallback for display labels and unknown values
  const normalized = status.toLowerCase().trim().replace(/[-_]/g, ' ');
  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  if (
    normalized.includes('pending') ||
    normalized.includes('not assigned') ||
    normalized.includes('order placed') ||
    normalized.includes('awaiting') ||
    normalized.includes('on hold')
  ) {
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
    dotColor = 'bg-amber-500';
  } else if (
    normalized.includes('accepted') ||
    normalized.includes('assigned') ||
    normalized.includes('shg accepted') ||
    normalized.includes('transporter accepted') ||
    normalized.includes('drop assigned')
  ) {
    colorClasses = 'bg-blue-50 text-blue-800 border-blue-200';
    dotColor = 'bg-blue-500';
  } else if (
    normalized.includes('picked') ||
    normalized.includes('in transit') ||
    normalized.includes('parcel at') ||
    normalized.includes('dispatch') ||
    normalized.includes('packing')
  ) {
    colorClasses = 'bg-orange-50 text-orange-800 border-orange-200';
    dotColor = 'bg-orange-500';
  } else if (
    normalized.includes('stored') ||
    normalized.includes('at hub') ||
    normalized.includes('hub received') ||
    normalized.includes('completed') ||
    normalized.includes('delivered') ||
    normalized.includes('dropped') ||
    normalized.includes('returned') ||
    normalized.includes('active') ||
    normalized.includes('approved') ||
    (normalized.includes('available') && !normalized.includes('not available')) ||
    normalized.includes('barcode') ||
    normalized.includes('ready')
  ) {
    colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    dotColor = 'bg-emerald-500';
  } else if (
    normalized.includes('reassigned') ||
    normalized.includes('rescheduled')
  ) {
    colorClasses = 'bg-purple-50 text-purple-800 border-purple-200';
    dotColor = 'bg-purple-500';
  } else if (
    normalized.includes('rejected') ||
    normalized.includes('cancelled') ||
    normalized.includes('declined') ||
    normalized.includes('sla breached') ||
    normalized.includes('inactive') ||
    normalized.includes('busy') ||
    normalized.includes('unavailable') ||
    normalized.includes('not available')
  ) {
    colorClasses = 'bg-red-50 text-red-800 border-red-200';
    dotColor = 'bg-red-500';
  }

  const label = status.toLowerCase().replace(/[-_]/g, ' ');
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClasses}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      <span className="capitalize">{label}</span>
    </span>
  );
};
