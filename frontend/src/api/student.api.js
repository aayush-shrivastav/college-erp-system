import api from './axios.js'
export const studentApi = {
  getProfile:           () => api.get('/student/profile'),
  updateProfile:        d  => api.put('/student/profile', d),
  getAvailableSubjects: () => api.get('/student/available-subjects'),
  registerSemester:     d  => api.post('/student/register-semester', d),
  getRegistrationStatus:() => api.get('/student/registration-status'),
  getAttendance:        () => api.get('/student/attendance'),
  getMarks:             () => api.get('/student/marks'),
  getFee:               () => api.get('/student/fee'),
  getNotifications:     () => api.get('/notifications'),
  getUnreadCount:       () => api.get('/notifications/unread-count'),
  markNotifRead:        ids => api.patch('/notifications/read', { ids }),
  markAllRead:          () => api.patch('/notifications/read-all'),
}
