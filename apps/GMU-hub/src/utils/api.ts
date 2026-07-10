const BASE_URL = 'http://localhost:3001';

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('gmu_token');
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const normalizedPath = path.replace(/\/+/g, '/');

  try {
    const response = await fetch(`${BASE_URL}${normalizedPath}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      localStorage.removeItem('gmu_token');
      localStorage.removeItem('gmu_user');
      localStorage.setItem('gmu_hub_current_page', 'landing');
      window.location.reload();
      throw new Error('Session expired. Please log in again.');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  } catch (error: any) {
    console.error(`API Error on ${path}:`, error);
    throw error;
  }
}

export const api = {
  auth: {
    sendOtp: (mobileNumber: string) =>
      request('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ mobileNumber }),
      }),
    verifyOtp: (mobileNumber: string, otp: string) =>
      request('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ mobileNumber, otp }),
      }),
    login: (mobileNumber: string, otp: string) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ mobileNumber, otp }),
      }),
    getProfile: () => request('/auth/profile'),
  },
  community: {
    getShgRequests: () => request('/community/shg/requests'),
    getShgMembers: () => request('/community/shg/members'),
    getShgRejected: () => request('/community/shg/rejected'),
    getIndividualRequests: () => request('/community/individual/requests'),
    getIndividualMembers: () => request('/community/individual/members'),
    getIndividualRejected: () => request('/community/individual/rejected'),
    getDetails: (id: string) => request(`/community/${id}`),
    approve: (id: string) => request(`/community/${id}/approve`, { method: 'PATCH' }),
    reject: (id: string) => request(`/community/${id}/reject`, { method: 'PATCH' }),
  },
  transporters: {
    getRoutePartnerRequests: () => request('/transporters/route-partners/requests'),
    getRoutePartnerMembers: () => request('/transporters/route-partners/members'),
    getRoutePartnerRejected: () => request('/transporters/route-partners/rejected'),
    getPersonalRequests: () => request('/transporters/personal/requests'),
    getPersonalMembers: () => request('/transporters/personal/members'),
    getPersonalRejected: () => request('/transporters/personal/rejected'),
    getDetails: (id: string) => request(`/transporters/${id}`),
    approve: (id: string) => request(`/transporters/${id}/approve`, { method: 'PATCH' }),
    reject: (id: string) => request(`/transporters/${id}/reject`, { method: 'PATCH' }),
  },
  orders: {
    create: (data: any) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
    createDrop: (data: any) => request('/orders/drop', { method: 'POST', body: JSON.stringify(data) }),
    getCounts: () => request('/orders/counts'),
    getDetails: (id: string) => request(`/orders/${id}`),
    getPickupNew: (status?: string, date?: string) => {
      const q = new URLSearchParams();
      if (status && status !== 'all') q.append('status', status);
      if (date) q.append('date', date);
      return request(`/orders/pickup/new?${q.toString()}`);
    },
    getPickupAssigned: (status?: string, date?: string) => {
      const q = new URLSearchParams();
      if (status && status !== 'all') q.append('status', status);
      if (date) q.append('date', date);
      return request(`/orders/pickup/assigned?${q.toString()}`);
    },
    getPickupWarehouse: (status?: string, date?: string) => {
      const q = new URLSearchParams();
      if (status && status !== 'all') q.append('status', status);
      if (date) q.append('date', date);
      return request(`/orders/pickup/warehouse?${q.toString()}`);
    },
    getPickupRejected: (status?: string, date?: string) => {
      const q = new URLSearchParams();
      if (status && status !== 'all') q.append('status', status);
      if (date) q.append('date', date);
      return request(`/orders/pickup/rejected?${q.toString()}`);
    },
    getPickupRescheduled: (status?: string, date?: string) => {
      const q = new URLSearchParams();
      if (status && status !== 'all') q.append('status', status);
      if (date) q.append('date', date);
      return request(`/orders/pickup/rescheduled?${q.toString()}`);
    },
    getDropNew: (status?: string, date?: string) => {
      const q = new URLSearchParams();
      if (status && status !== 'all') q.append('status', status);
      if (date) q.append('date', date);
      return request(`/orders/drop/new?${q.toString()}`);
    },
    getDropAssigned: (status?: string, date?: string) => {
      const q = new URLSearchParams();
      if (status && status !== 'all') q.append('status', status);
      if (date) q.append('date', date);
      return request(`/orders/drop/assigned?${q.toString()}`);
    },
    getDropRejected: (status?: string, date?: string) => {
      const q = new URLSearchParams();
      if (status && status !== 'all') q.append('status', status);
      if (date) q.append('date', date);
      return request(`/orders/drop/rejected?${q.toString()}`);
    },
    getDropRescheduled: (status?: string, date?: string) => {
      const q = new URLSearchParams();
      if (status && status !== 'all') q.append('status', status);
      if (date) q.append('date', date);
      return request(`/orders/drop/rescheduled?${q.toString()}`);
    },
    getDropCompleted: (status?: string, date?: string) => {
      const q = new URLSearchParams();
      if (status && status !== 'all') q.append('status', status);
      if (date) q.append('date', date);
      return request(`/orders/drop/completed?${q.toString()}`);
    },
    getReturnsTransporter: (status?: string, date?: string) => {
      const q = new URLSearchParams();
      if (status && status !== 'all') q.append('status', status);
      if (date) q.append('date', date);
      return request(`/orders/returns/transporter?${q.toString()}`);
    },
    getReturnsBuyer: (status?: string, date?: string) => {
      const q = new URLSearchParams();
      if (status && status !== 'all') q.append('status', status);
      if (date) q.append('date', date);
      return request(`/orders/returns/buyer?${q.toString()}`);
    },
    getInventoryStored: (status?: string, date?: string) => {
      const q = new URLSearchParams();
      if (status && status !== 'all') q.append('status', status);
      if (date) q.append('date', date);
      return request(`/orders/inventory/stored?${q.toString()}`);
    },
    getInventoryTransporterReturn: (status?: string, date?: string) => {
      const q = new URLSearchParams();
      if (status && status !== 'all') q.append('status', status);
      if (date) q.append('date', date);
      return request(`/orders/inventory/transporter-return?${q.toString()}`);
    },
    getInventoryBuyerReturn: (status?: string, date?: string) => {
      const q = new URLSearchParams();
      if (status && status !== 'all') q.append('status', status);
      if (date) q.append('date', date);
      return request(`/orders/inventory/buyer-return?${q.toString()}`);
    },

    broadcastShg: (id: string) => request(`/orders/${id}/broadcast-shg`, { method: 'POST' }),
    shgAccept: (id: string, shgId: string) => request(`/orders/${id}/shg-accept`, { method: 'POST', body: JSON.stringify({ shgId }) }),
    shgReject: (id: string, shgId: string) => request(`/orders/${id}/shg-reject`, { method: 'POST', body: JSON.stringify({ shgId }) }),
    shgReschedule: (id: string, shgId: string, duration: string) => request(`/orders/${id}/shg-reschedule`, { method: 'POST', body: JSON.stringify({ shgId, duration }) }),
    shgPicked: (id: string) => request(`/orders/${id}/shg-picked`, { method: 'POST' }),

    broadcastTransporter: (id: string) => request(`/orders/${id}/broadcast-transporter`, { method: 'POST' }),
    transporterAccept: (id: string, transporterId: string) => request(`/orders/${id}/transporter-accept`, { method: 'POST', body: JSON.stringify({ transporterId }) }),
    transporterReject: (id: string, transporterId: string) => request(`/orders/${id}/transporter-reject`, { method: 'POST', body: JSON.stringify({ transporterId }) }),
    transporterReschedule: (id: string, transporterId: string) => request(`/orders/${id}/transporter-reschedule`, { method: 'POST', body: JSON.stringify({ transporterId }) }),
    transporterPicked: (id: string) => request(`/orders/${id}/transporter-picked`, { method: 'POST' }),

    warehouseIntake: (id: string) => request(`/orders/${id}/warehouse-intake`, { method: 'POST' }),
    generateBarcode: (id: string) => request(`/orders/${id}/generate-barcode`, { method: 'POST' }),
    store: (id: string) => request(`/orders/${id}/store`, { method: 'POST' }),
    scan: (id: string, barcode: string) => request(`/orders/${id}/scan`, { method: 'POST', body: JSON.stringify({ barcode }) }),

    dropShgBroadcast: (id: string) => request(`/orders/${id}/drop-shg-broadcast`, { method: 'POST' }),
    dropShgAccept: (id: string, shgId: string) => request(`/orders/${id}/drop-shg-accept`, { method: 'POST', body: JSON.stringify({ shgId }) }),
    dropShgReject: (id: string, shgId: string) => request(`/orders/${id}/drop-shg-reject`, { method: 'POST', body: JSON.stringify({ shgId }) }),
    dropShgReschedule: (id: string, shgId: string, duration: string) => request(`/orders/${id}/drop-shg-reschedule`, { method: 'POST', body: JSON.stringify({ shgId, duration }) }),

    dropTransporterBroadcast: (id: string) => request(`/orders/${id}/drop-transporter-broadcast`, { method: 'POST' }),
    dropTransporterAccept: (id: string, transporterId: string) => request(`/orders/${id}/drop-transporter-accept`, { method: 'POST', body: JSON.stringify({ transporterId }) }),
    dropTransporterReject: (id: string, transporterId: string) => request(`/orders/${id}/drop-transporter-reject`, { method: 'POST', body: JSON.stringify({ transporterId }) }),
    dropTransporterReschedule: (id: string, transporterId: string) => request(`/orders/${id}/drop-transporter-reschedule`, { method: 'POST', body: JSON.stringify({ transporterId }) }),
    dropTransporterPicked: (id: string) => request(`/orders/${id}/drop-transporter-picked`, { method: 'POST' }),
    dropTransporterDropsToShg: (id: string) => request(`/orders/${id}/drop-transporter-drops-to-shg`, { method: 'POST' }),
    dropComplete: (id: string) => request(`/orders/${id}/drop-complete`, { method: 'POST' }),

    createTransporterReturn: (id: string) => request(`/orders/${id}/transporter-return`, { method: 'POST' }),
    transporterReturnIntake: (id: string) => request(`/orders/${id}/transporter-return-intake`, { method: 'POST' }),
    transporterReturnScan: (id: string, barcode: string) => request(`/orders/${id}/transporter-return-scan`, { method: 'POST', body: JSON.stringify({ barcode }) }),
    buyerReturnScan: (id: string, barcode: string) => request(`/orders/${id}/buyer-return-scan`, { method: 'POST', body: JSON.stringify({ barcode }) }),
    transporterReturnDispatch: (id: string, barcode: string) => request(`/orders/${id}/transporter-return-dispatch`, { method: 'POST', body: JSON.stringify({ barcode }) }),
    redispatchOrder: (id: string) => request(`/orders/${id}/redispatch`, { method: 'POST' }),

    requestBuyerReturn: (id: string) => request(`/orders/${id}/buyer-return/request`, { method: 'POST' }),
    buyerReturnShgAccept: (id: string) => request(`/orders/${id}/buyer-return/shg-accept`, { method: 'POST' }),
    buyerReturnShgPicked: (id: string) => request(`/orders/${id}/buyer-return/shg-picked`, { method: 'POST' }),
    broadcastBuyerReturnTransporter: (id: string) => request(`/orders/${id}/buyer-return/broadcast-transporter`, { method: 'POST' }),
    buyerReturnTransporterAccept: (id: string, transporterId: string) => request(`/orders/${id}/buyer-return/transporter-accept`, { method: 'POST', body: JSON.stringify({ transporterId }) }),
    buyerReturnTransporterPicked: (id: string) => request(`/orders/${id}/buyer-return/transporter-picked`, { method: 'POST' }),
    buyerReturnTransporterDelivered: (id: string) => request(`/orders/${id}/buyer-return/transporter-delivered`, { method: 'POST' }),
    buyerReturnIntake: (id: string) => request(`/orders/${id}/buyer-return/intake`, { method: 'POST' }),

    // ── Exception Lifecycle ───────────────────────────────────────────────────
    completeOrder: (id: string) => request(`/orders/${id}/complete`, { method: 'POST' }),
    holdOrder: (id: string) => request(`/orders/${id}/hold`, { method: 'POST' }),
    cancelOrder: (id: string) => request(`/orders/${id}/cancel`, { method: 'POST' }),
    slaBreachOrder: (id: string) => request(`/orders/${id}/sla-breach`, { method: 'POST' }),
    simulateRescheduleTimeout: (id: string) => request(`/orders/${id}/simulate-reschedule-timeout`, { method: 'POST' }),
  },
};
export default api;
