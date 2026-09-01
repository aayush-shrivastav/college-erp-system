import api from './axios.js'
export const adminApi = {
  // Foundation
  getBranches:       () => api.get('/admin/branches'),
  // Students
  listStudents:      p  => api.get('/admin/students', { params: p }),
  getStudent:        id => api.get(`/admin/students/${id}`),
  createStudent:     d  => api.post('/admin/students', d),
  updateStudent:     (id, d) => api.patch(`/admin/students/${id}`, d),
  deleteStudent:     id => api.delete(`/admin/students/${id}`),
  bulkImportStudents: file => {
    const form = new FormData(); form.append('file', file)
    return api.post('/admin/students/bulk', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  // Teachers
  listTeachers:      (p)   => api.get('/admin/teachers', { params: p }),
  createTeacher:     (d)   => api.post('/admin/teachers', d),
  bulkImportTeachers: (file) => {
    const form = new FormData(); form.append('file', file)
    return api.post('/admin/teachers/bulk', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  deleteTeacher:     id => api.delete(`/admin/teachers/${id}`),
  assignMentorsRange:(d)   => api.post('/admin/students/assign-mentors-range', d),
  // Syllabus
  getSyllabusVersions:   () => api.get('/admin/syllabus-versions'),
  createSyllabusVersion: d  => api.post('/admin/syllabus-versions', d),
  getSubjects:       () => api.get('/admin/subjects'),
  createSubject:     d  => api.post('/admin/create-subject', d),
  deleteSubject:     id => api.delete(`/admin/subjects/${id}`),
  // Promotion
  openPromotion:     d  => api.post('/admin/promotion/open', d),
  closePromotion:    () => api.post('/admin/promotion/close'),
  // Reports
  getFeeReportsStatus: p => api.get('/admin/fee-reports/status', { params: p }),
  // Timetable
  bulkImportTimetable: file => {
    const form = new FormData(); form.append('file', file)
    return api.post('/timetable/bulk', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  // Structure Basics
  getBatches:        (cId) => api.get('/admin/batches', { params: { courseId: cId } }),
  getSections:       (bId) => api.get(`/admin/batches/${bId}/sections`),
  // Coordinators
  getCoordinators: () => api.get('/admin/structure/coordinators'),
  assignCoordinator: d => api.post('/admin/structure/coordinators', d),
  removeCoordinator: id => api.delete(`/admin/structure/coordinators/${id}`),
}
