import { api } from './client'

export const authApi = {
  login: (body) => api.post('/auth/login', body),
  register: (body) => api.post('/auth/register', body),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  me: () => api.get('/auth/me'),
  forgot: (email) => api.post('/auth/forgot-password', { email }),
  reset: (body) => api.post('/auth/reset-password', body),
  changePassword: (body) => api.post('/auth/change-password', body),
  kycAccess: (token) => api.post('/auth/kyc-access', { token }),
}

export const userApi = {
  list: (params) => api.get('/users', { params }),
  members: (params) => api.get('/members', { params }),
  get: (id) => api.get(`/users/${id}`),
  member360: (id) => api.get(`/members/${id}/360`),
  updateMe: (body) => api.put('/members/me', body),
  update: (id, body) => api.put(`/users/${id}`, body),
  status: (id, status) => api.patch(`/users/${id}/status`, { status }),
  createMember: (body) => api.post('/users', body),
  createStaff: (body) => api.post('/staff', body),
  updateStaff: (id, body) => api.put(`/staff/${id}`, body),
  staff: (params) => api.get('/staff', { params }),
}

export const customerApi = {
  list: (params) => api.get('/customers', { params }),
  get: (id) => api.get(`/customers/${id}`),
  create: (body) => api.post('/customers', body),
  update: (id, body) => api.put(`/customers/${id}`, body),
}

export const roleApi = {
  catalog: () => api.get('/roles/catalog'),
  list: (params) => api.get('/roles', { params }),
  get: (id) => api.get(`/roles/${id}`),
  create: (body) => api.post('/roles', body),
  update: (id, body) => api.put(`/roles/${id}`, body),
  remove: (id) => api.delete(`/roles/${id}`),
}

export const kycApi = {
  mine: () => api.get('/kyc/me'),
  submit: (form) => api.post('/kyc', form),
  list: (params) => api.get('/kyc', { params }),
  decide: (id, body) => api.post(`/kyc/${id}/decide`, body),
  documentUrl: (id) => `${api.defaults.baseURL}/kyc/documents/${id}`,
}

export const membershipApi = {
  plans: (params) => api.get('/membership-plans', { params }),
  getPlan: (id) => api.get(`/membership-plans/${id}`),
  ensureRoom: (id) => api.post(`/membership-plans/${id}/ensure-room`),
  savePlan: (id, body) => (id ? api.put(`/membership-plans/${id}`, body) : api.post('/membership-plans', body)),
  createPhysicalSeats: (body) => api.post('/membership-plans/physical-seats', body),
  deactivatePlan: (id) => api.delete(`/membership-plans/${id}`),
  list: (params) => api.get('/memberships', { params }),
  mine: () => api.get('/memberships/me'),
  assign: (body) => api.post('/memberships', body),
  cancel: (id) => api.post(`/memberships/${id}/cancel`),
}

export const productCatalogApi = {
  centers: (params) => api.get('/product-centers', { params }),
  saveCenter: (id, body) => (id ? api.put(`/product-centers/${id}`, body) : api.post('/product-centers', body)),
  deactivateCenter: (id) => api.delete(`/product-centers/${id}`),
  categories: (params) => api.get('/catalog-categories', { params }),
  saveCategory: (id, body) => (id ? api.put(`/catalog-categories/${id}`, body) : api.post('/catalog-categories', body)),
  deactivateCategory: (id) => api.delete(`/catalog-categories/${id}`),
}

export const virtualOfficeApi = {
  list: (params) => api.get('/virtual-office', { params }),
  get: (id) => api.get(`/virtual-office/${id}`),
  create: (body) => api.post('/virtual-office', body),
  update: (id, body) => api.put(`/virtual-office/${id}`, body),
  renew: (id, body) => api.post(`/virtual-office/${id}/renew`, body),
}

export const contractApi = {
  list: (params) => api.get('/contracts', { params }),
  expiring: (params) => api.get('/contracts/expiring', { params }),
  get: (id) => api.get(`/contracts/${id}`),
  create: (body) => api.post('/contracts', body),
  update: (id, body) => api.put(`/contracts/${id}`, body),
  transition: (id, body) => api.post(`/contracts/${id}/transition`, body),
  renew: (id, body) => api.post(`/contracts/${id}/renew`, body),
  generatePack: (id) => api.post(`/contracts/${id}/pack`),
  uploadSigned: (id, file, role, remarks) => {
    const form = new FormData()
    form.append('file', file)
    if (role) form.append('role', role)
    if (remarks) form.append('remarks', remarks)
    return api.post(`/contracts/${id}/upload-signed`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

export const docsApi = {
  upload: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/uploads/docs', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

export const workspaceApi = {
  categories: () => api.get('/workspace-categories'),
  branches: (params) => api.get('/branches', { params }),
  saveBranch: (id, body) => (id ? api.put(`/branches/${id}`, body) : api.post('/branches', body)),
  list: (params) => api.get('/workspaces', { params }),
  get: (id) => api.get(`/workspaces/${id}`),
  create: (body) => api.post('/workspaces', body),
  update: (id, body) => api.put(`/workspaces/${id}`, body),
  status: (id, body) => api.post(`/workspaces/${id}/status`, body),
  remove: (id) => api.delete(`/workspaces/${id}`),
  inventory: () => api.get('/workspaces/inventory-summary'),
}

export const conferenceApi = {
  list: (params) => api.get('/conference-rooms', { params }),
  get: (id) => api.get(`/conference-rooms/${id}`),
  create: (body) => api.post('/conference-rooms', body),
  update: (id, body) => api.put(`/conference-rooms/${id}`, body),
  remove: (id) => api.delete(`/conference-rooms/${id}`),
}

export const bookingApi = {
  availability: (params) => api.get('/availability', { params }),
  slots: (params) => api.get('/availability/slots', { params }),
  conferenceGrid: (params) => api.get('/availability/conference-grid', { params }),
  rules: () => api.get('/booking-rules'),
  list: (params) => api.get('/bookings', { params }),
  get: (id) => api.get(`/bookings/${id}`),
  create: (body) => api.post('/bookings', body),
  cancel: (id, reason) => api.post(`/bookings/${id}/cancel`, { reason }),
  checkIn: (id) => api.post(`/bookings/${id}/check-in`),
  checkOut: (id) => api.post(`/bookings/${id}/check-out`),
}

export const paymentApi = {
  list: (params) => api.get('/payments', { params }),
  get: (id) => api.get(`/payments/${id}`),
  record: (body) => api.post('/payments/manual', body),
  sandboxConfirm: (id) => api.post(`/payments/${id}/sandbox-confirm`),
  refund: (id, body) => api.post(`/payments/${id}/refund`, body),
}

export const invoiceApi = {
  list: (params) => api.get('/invoices', { params }),
}

export const maintenanceApi = {
  categories: () => api.get('/maintenance/categories'),
  list: (params) => api.get('/maintenance', { params }),
  get: (id) => api.get(`/maintenance/${id}`),
  create: (form) => api.post('/maintenance', form),
  assign: (id, body) => api.post(`/maintenance/${id}/assign`, body),
  status: (id, body) => api.post(`/maintenance/${id}/status`, body),
}

export const dashboardApi = {
  admin: () => api.get('/dashboard/admin'),
  member: () => api.get('/dashboard/member'),
  frontDesk: () => api.get('/dashboard/front-desk'),
  maintenance: () => api.get('/dashboard/maintenance'),
}

export const reportApi = {
  run: (type, params) => api.get(`/reports/${type}`, { params }),
  export: (type, params) => api.get(`/reports/${type}`, { params: { ...params, export: 'csv' }, responseType: 'blob' }),
}

export const notificationApi = {
  list: (params) => api.get('/notifications', { params }),
  read: (id) => api.post(`/notifications/${id}/read`),
}

export const settingsApi = {
  public: () => api.get('/settings/public'),
  get: () => api.get('/settings'),
  update: (body) => api.put('/settings', body),
  testMail: (body) => api.post('/settings/test-mail', body),
}

export const auditApi = {
  list: (params) => api.get('/audit-logs', { params }),
}

export const inquiryApi = {
  list: (params) => api.get('/inquiries', { params }),
  get: (id) => api.get(`/inquiries/${id}`),
  create: (body) => api.post('/inquiries', body),
  update: (id, body) => api.patch(`/inquiries/${id}`, body),
  remove: (id) => api.delete(`/inquiries/${id}`),
  convert: (id, body) => api.post(`/inquiries/${id}/convert`, body),
  sendDeposit: (id, body) => api.post(`/inquiries/${id}/send-deposit`, body),
  addFollowUp: (id, body) => api.post(`/inquiries/${id}/follow-ups`, body),
  followUps: (params) => api.get('/follow-ups', { params }),
  sampleExcel: () => api.get('/inquiries/import/sample', { responseType: 'blob' }),
  importExcel: (file) => {
    const body = new FormData()
    body.append('file', file)
    return api.post('/inquiries/import', body)
  },
}

export const onboardingApi = {
  mine: () => api.get('/onboarding/me'),
  saveDocs: (body) => api.patch('/onboarding/me', body),
  requestReactivation: (body) => api.post('/onboarding/me/request-reactivation', body),
  requestReactivationPublic: (body) => api.post('/public/reactivation-request', body),
  listReactivations: () => api.get('/onboarding/reactivations'),
  approveReactivation: (userId, body) => api.post(`/onboarding/${userId}/reactivate`, body),
  publicPayment: (id) => api.get(`/public/payments/${id}`),
  publicPay: (id) => api.post(`/public/payments/${id}/pay`),
}

export const hrmApi = {
  listStaff: (params) => api.get('/hrm/staff', { params }),
  getStaff: (id) => api.get(`/hrm/staff/${id}`),
  updateWorkInfo: (id, body) => api.put(`/hrm/staff/${id}`, body),
  listAttendance: (params) => api.get('/hrm/attendance', { params }),
  upsertAttendance: (body) => api.post('/hrm/attendance', body),
  listLeaves: (params) => api.get('/hrm/leaves', { params }),
  createLeave: (body) => api.post('/hrm/leaves', body),
  decideLeave: (id, body) => api.post(`/hrm/leaves/${id}/decide`, body),
  listPayslips: (params) => api.get('/hrm/payslips', { params }),
  upsertPayslip: (body) => api.post('/hrm/payslips', body),
  pending: () => api.get('/hrm/pending'),
  workStats: (id) => api.get(`/hrm/staff/${id}/work-stats`),
}

export const accountsApi = {
  rentCollection: (params) => api.get('/accounts/rent-collection', { params }),
  saveRentRow: (body) => api.post('/accounts/rent-collection', body),
}

export const cmsApi = {
  site: () => api.get('/cms/site'),
  page: (key) => api.get(`/cms/pages/${key}`),
  blog: () => api.get('/cms/blog'),
  blogPost: (slug) => api.get(`/cms/blog/${slug}`),
  gallery: () => api.get('/cms/gallery'),
  partners: () => api.get('/cms/partners'),
  solutions: () => api.get('/cms/solutions'),
  solution: (slug) => api.get(`/cms/solutions/${slug}`),
  adminSiteGet: () => api.get('/admin/cms/site'),
  adminSiteSave: (body) => api.put('/admin/cms/site', body),
  adminPages: () => api.get('/admin/cms/pages'),
  adminPageSave: (key, body) => api.put(`/admin/cms/pages/${key}`, { ...body, key }),
  adminPageDelete: (key) => api.delete(`/admin/cms/pages/${key}`),
  adminBlog: () => api.get('/admin/cms/blog'),
  adminBlogCreate: (body) => api.post('/admin/cms/blog', body),
  adminBlogUpdate: (id, body) => api.put(`/admin/cms/blog/${id}`, body),
  adminBlogDelete: (id) => api.delete(`/admin/cms/blog/${id}`),
  adminGallery: () => api.get('/admin/cms/gallery'),
  adminGalleryCreate: (body) => api.post('/admin/cms/gallery', body),
  adminGalleryUpdate: (id, body) => api.put(`/admin/cms/gallery/${id}`, body),
  adminGalleryDelete: (id) => api.delete(`/admin/cms/gallery/${id}`),
  adminPartners: () => api.get('/admin/cms/partners'),
  adminPartnersCreate: (body) => api.post('/admin/cms/partners', body),
  adminPartnersUpdate: (id, body) => api.put(`/admin/cms/partners/${id}`, body),
  adminPartnersDelete: (id) => api.delete(`/admin/cms/partners/${id}`),
  adminSolutions: () => api.get('/admin/cms/solutions'),
  adminSolutionsCreate: (body) => api.post('/admin/cms/solutions', body),
  adminSolutionsUpdate: (id, body) => api.put(`/admin/cms/solutions/${id}`, body),
  adminSolutionsDelete: (id) => api.delete(`/admin/cms/solutions/${id}`),
  upload: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/admin/cms/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}
