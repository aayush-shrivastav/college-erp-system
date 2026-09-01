const router = require('express').Router();
const {
  getEligibleScholarships,
  applyForScholarship,
  getMyApplications,
  appealApplication,
  upload
} = require('./scholarship.student.controller');

router.get('/eligible', getEligibleScholarships);
router.get('/applications', getMyApplications);
router.post('/apply', upload.single('document'), applyForScholarship);
router.post('/applications/:id/appeal', appealApplication);

module.exports = router;
