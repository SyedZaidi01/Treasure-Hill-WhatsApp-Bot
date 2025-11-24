const Conversation = require('../models/Conversation');

// Simple authentication middleware
exports.checkAuth = (req, res, next) => {
  if (req.session.isAuthenticated) {
    return next();
  }
  res.redirect('/admin/login');
};

// Show login page
exports.showLogin = (req, res) => {
  if (req.session.isAuthenticated) {
    return res.redirect('/admin/dashboard');
  }
  res.render('login', { error: null });
};

// Handle login
exports.login = (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    req.session.isAuthenticated = true;
    res.redirect('/admin/dashboard');
  } else {
    res.render('login', { error: 'Invalid credentials' });
  }
};

// Handle logout
exports.logout = (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
};

// Show dashboard
exports.showDashboard = async (req, res) => {
  try {
    const conversations = await Conversation.find()
      .sort({ lastMessageAt: -1 })
      .limit(50);

    const stats = {
      totalConversations: await Conversation.countDocuments(),
      activeConversations: await Conversation.countDocuments({ status: 'active' }),
      totalMessages: await Conversation.aggregate([
        { $group: { _id: null, total: { $sum: '$metadata.totalMessages' } } }
      ]).then(result => result[0]?.total || 0)
    };

    res.render('dashboard', {
      conversations,
      stats,
      moment: require('moment')
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Error loading dashboard');
  }
};

// Show conversation details
exports.showConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).send('Conversation not found');
    }

    res.render('conversation', {
      conversation,
      moment: require('moment')
    });
  } catch (error) {
    console.error('Error loading conversation:', error);
    res.status(500).send('Error loading conversation');
  }
};

// Delete conversation
exports.deleteConversation = async (req, res) => {
  try {
    await Conversation.findByIdAndDelete(req.params.id);
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).send('Error deleting conversation');
  }
};
