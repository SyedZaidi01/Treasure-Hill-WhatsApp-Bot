const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Login routes
router.get('/login', adminController.showLogin);
router.post('/login', adminController.login);
router.get('/logout', adminController.logout);

// Protected routes
router.get('/', adminController.checkAuth, (req, res) => {
  res.redirect('/admin/dashboard');
});

router.get('/dashboard', adminController.checkAuth, adminController.showDashboard);
router.get('/conversation/:id', adminController.checkAuth, adminController.showConversation);
router.post('/conversation/:id/delete', adminController.checkAuth, adminController.deleteConversation);

module.exports = router;
