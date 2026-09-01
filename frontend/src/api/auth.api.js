// src/api/auth.api.js
import api from './axios'
export const authApi = {
  login:           d => api.post('/auth/login', d),
  logout:          () => api.post('/auth/logout'),
  refresh:         d => api.post('/auth/refresh', d),
  changePassword:  d => api.post('/auth/change-password', d),
  forgotPassword:  d => api.post('/auth/forgot-password', d),
  resetPassword:   d => api.post('/auth/reset-password', d),
}
