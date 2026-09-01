const router = require('express').Router();
const {
  createScholarship,
  getScholarships,
  updateScholarship,
  getApplications,
  approveApplication,
  rejectApplication,
  getAnalytics
} = require('./scholarship.admin.controller');

router.post('/setup', createScholarship);
router.get('/setup', getScholarships);
router.patch('/setup/:id', updateScholarship);

router.get('/applications', getApplications);
router.post('/applications/:id/approve', approveApplication);
router.post('/applications/:id/reject', rejectApplication);

router.get('/analytics', getAnalytics);

module.exports = router;
