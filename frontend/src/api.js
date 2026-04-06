const BASE = '/api';

async function api(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

export const auth = {
  register: (body) => api('/auth/register', { method: 'POST', body }),
  login: (body) => api('/auth/login', { method: 'POST', body }),
  me: () => api('/auth/me'),
  updateProfile: (body) => api('/auth/me', { method: 'PUT', body }),
};

export const opportunities = {
  list: (params = '') => api(`/opportunities?${params}`),
  get: (id) => api(`/opportunities/${id}`),
  create: (body) => api('/opportunities', { method: 'POST', body }),
  update: (id, body) => api(`/opportunities/${id}`, { method: 'PUT', body }),
  moderate: (id, body) => api(`/opportunities/${id}/moderate`, { method: 'POST', body }),
  close: (id) => api(`/opportunities/${id}/close`, { method: 'POST' }),
  my: () => api('/opportunities/my/listings'),
};

export const applications = {
  apply: (body) => api('/applications', { method: 'POST', body }),
  my: () => api('/applications/my'),
  forOpportunity: (id) => api(`/applications/opportunity/${id}`),
  updateStatus: (id, body) => api(`/applications/${id}/status`, { method: 'PUT', body }),
  withdraw: (id) => api(`/applications/${id}/withdraw`, { method: 'POST' }),
};

export const trust = {
  submitVerification: (body) => api('/trust/verify', { method: 'POST', body }),
  reviewVerification: (id, body) => api(`/trust/verify/${id}`, { method: 'PUT', body }),
  pendingVerifications: () => api('/trust/verifications/pending'),
  initiateScreening: (body) => api('/trust/screen', { method: 'POST', body }),
  completeScreening: (id, body) => api(`/trust/screen/${id}`, { method: 'PUT', body }),
  pendingScreenings: () => api('/trust/screenings/pending'),
};

export const admin = {
  dashboard: () => api('/admin/dashboard'),
  users: (params = '') => api(`/admin/users?${params}`),
  updateUserStatus: (id, body) => api(`/admin/users/${id}/status`, { method: 'PUT', body }),
  moderationQueue: () => api('/admin/moderation/queue'),
  complaints: () => api('/admin/complaints'),
  fileComplaint: (body) => api('/admin/complaints', { method: 'POST', body }),
  updateComplaint: (id, body) => api(`/admin/complaints/${id}`, { method: 'PUT', body }),
  categories: () => api('/admin/categories'),
  audit: (params = '') => api(`/admin/audit?${params}`),
  submitFeedback: (body) => api('/admin/feedback', { method: 'POST', body }),
};
