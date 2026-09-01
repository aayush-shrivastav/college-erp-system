import api from './axios.js'
export const accountsApi = {
  getFeeMasters:       () => api.get('/accounts/fee-masters'),
  createFeeMaster:     d  => api.post('/accounts/fee-masters', d),
  deleteFeeMaster:     id => api.delete(`/accounts/fee-masters/${id}`),
  getHostels:          () => api.get('/accounts/hostels'),
  createHostel:        d  => api.post('/accounts/hostels', d),
  deleteHostel:        id => api.delete(`/accounts/hostels/${id}`),
  getBuses:            () => api.get('/accounts/buses'),
  createBus:           (data) => api.post('/accounts/buses', data),
  deleteBus:           id => api.delete(`/accounts/buses/${id}`),
  
  getMess:             () => api.get('/accounts/mess'),
  createMess:          (data) => api.post('/accounts/mess', data),
  deleteMess:          id => api.delete(`/accounts/mess/${id}`),

  searchStudents:      (q, batchId)  => api.get('/accounts/students/search', { params: { q, batchId } }),
  getStudentFeeAccount: id => api.get(`/accounts/students/${id}/fee-account`),
  initFeeAccount:      (id, d) => api.post(`/accounts/students/${id}/fee-account`, d),
  bulkInitFeeProfiles: d  => api.post(`/accounts/students/bulk-fee-profile`, d),
  
  recordPayment:       d  => api.post('/accounts/payments', d),
  deletePayment:       id => api.delete(`/accounts/payments/${id}`),
  
  getFines:            p  => api.get('/accounts/fines', { params: p }),
  addFine:             d  => api.post('/accounts/fines', d),
  waiveFine:           (id, d) => api.patch(`/accounts/fines/${id}/waive`, d),
  payFine:             (id, d) => api.patch(`/accounts/fines/${id}/pay`, d),
  
  getOutstanding:      () => api.get('/accounts/reports/outstanding'),
  getCollection:       () => api.get('/accounts/reports/collection'),
}
