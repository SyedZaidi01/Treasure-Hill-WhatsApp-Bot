const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const hubspotPoller = require('../services/hubspotPoller');
const moment = require('moment');

// Middleware to check authentication (reuse from admin)
const checkAuth = (req, res, next) => {
  if (req.session.isAuthenticated) {
    return next();
  }
  res.redirect('/admin/login');
};

// Apply auth to all routes
router.use(checkAuth);

/**
 * GET /admin/leads - View all leads dashboard
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 25;
    const skip = (page - 1) * limit;
    const statusFilter = req.query.status || '';

    // Build query
    const query = {};
    if (statusFilter) {
      query.status = statusFilter;
    }

    // Get leads
    const leads = await Lead.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get stats
    const stats = await Lead.getStats();
    const totalLeads = await Lead.countDocuments(query);
    const totalPages = Math.ceil(totalLeads / limit);

    // Get poller status
    const pollerStatus = hubspotPoller.getStatus();

    res.render('leads', {
      leads,
      stats,
      pollerStatus,
      currentPage: page,
      totalPages,
      totalLeads,
      statusFilter,
      moment
    });

  } catch (error) {
    console.error('Error loading leads:', error);
    res.status(500).send('Error loading leads dashboard');
  }
});

/**
 * GET /admin/leads/:id - View single lead details
 */
router.get('/:id', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).send('Lead not found');
    }

    res.render('lead-detail', {
      lead,
      moment
    });

  } catch (error) {
    console.error('Error loading lead:', error);
    res.status(500).send('Error loading lead');
  }
});

/**
 * POST /admin/leads/:id/status - Update lead status
 */
router.post('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'closed', 'failed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).send('Invalid status');
    }

    await Lead.findByIdAndUpdate(req.params.id, {
      status,
      updatedAt: new Date()
    });

    res.redirect(`/admin/leads/${req.params.id}`);

  } catch (error) {
    console.error('Error updating lead status:', error);
    res.status(500).send('Error updating lead');
  }
});

/**
 * POST /admin/leads/:id/notes - Add notes to lead
 */
router.post('/:id/notes', async (req, res) => {
  try {
    const { notes } = req.body;

    await Lead.findByIdAndUpdate(req.params.id, {
      callNotes: notes,
      updatedAt: new Date()
    });

    res.redirect(`/admin/leads/${req.params.id}`);

  } catch (error) {
    console.error('Error updating lead notes:', error);
    res.status(500).send('Error updating lead');
  }
});

/**
 * POST /admin/leads/:id/delete - Delete a lead
 */
router.post('/:id/delete', async (req, res) => {
  try {
    await Lead.findByIdAndDelete(req.params.id);
    res.redirect('/admin/leads');

  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).send('Error deleting lead');
  }
});

/**
 * POST /admin/leads/poll - Trigger manual HubSpot poll
 */
router.post('/poll', async (req, res) => {
  try {
    await hubspotPoller.triggerPoll();
    res.redirect('/admin/leads?polled=true');

  } catch (error) {
    console.error('Error triggering poll:', error);
    res.status(500).send('Error triggering poll');
  }
});

/**
 * GET /admin/leads/api/test-connection - Test HubSpot connection
 */
router.get('/api/test-connection', async (req, res) => {
  try {
    const result = await hubspotPoller.testConnection();
    res.json(result);

  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /admin/leads/api/stats - Get lead stats as JSON
 */
router.get('/api/stats', async (req, res) => {
  try {
    const stats = await Lead.getStats();
    const pollerStatus = hubspotPoller.getStatus();
    
    res.json({
      success: true,
      stats,
      pollerStatus
    });

  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
