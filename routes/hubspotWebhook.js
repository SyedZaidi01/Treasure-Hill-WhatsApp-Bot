const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');

/**
 * POST /webhook/hubspot
 * Receives new contact data from Zapier (HubSpot → Zapier → This webhook)
 */
router.post('/', async (req, res) => {
  try {
    console.log('📥 Received HubSpot webhook from Zapier');
    console.log('   Data:', JSON.stringify(req.body, null, 2));

    const data = req.body;

    // Extract fields from Zapier payload
    const leadData = {
      hubspotId: data.objectId || data.id || data.hs_object_id || String(Date.now()),
      objectId: data.objectId || data.id || data.hs_object_id,
      email: data.email || '',
      phone: data.phone || '',
      mobilePhone: data.mobile_phone || data.mobilephone || '',
      firstName: data.firstname || data.firstName || '',
      lastName: data.lastname || data.lastName || '',
      projectName: data.project_name || data.community_preference || data.projectName || '',
      source: 'hubspot_webhook',
      status: 'new',
      createdAt: new Date(),
      updatedAt: new Date(),
      rawData: data
    };

    // Check if lead already exists
    let existingLead = null;
    
    if (leadData.hubspotId) {
      existingLead = await Lead.findOne({ hubspotId: leadData.hubspotId });
    }
    
    if (!existingLead && leadData.email) {
      existingLead = await Lead.findOne({ email: leadData.email });
    }

    if (existingLead) {
      // Update existing lead
      await Lead.findByIdAndUpdate(existingLead._id, {
        ...leadData,
        hubspotId: existingLead.hubspotId, // Keep original ID
        createdAt: existingLead.createdAt, // Keep original create date
        status: existingLead.status // Keep current status
      });
      console.log(`   ✅ Updated existing lead: ${leadData.firstName} ${leadData.lastName}`);
    } else {
      // Create new lead
      const newLead = new Lead(leadData);
      await newLead.save();
      console.log(`   ✅ Created new lead: ${leadData.firstName} ${leadData.lastName} (${leadData.email})`);
    }

    // Send success response to Zapier
    res.status(200).json({
      success: true,
      message: 'Lead received successfully',
      leadId: leadData.hubspotId
    });

  } catch (error) {
    console.error('❌ HubSpot webhook error:', error);
    
    // Still return 200 to Zapier to prevent retries
    // Log the error but don't fail the webhook
    res.status(200).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /webhook/hubspot
 * Health check endpoint
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    endpoint: 'HubSpot Webhook (via Zapier)',
    message: 'Send POST requests to this endpoint'
  });
});

module.exports = router;
