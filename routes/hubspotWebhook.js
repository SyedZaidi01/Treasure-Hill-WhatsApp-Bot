const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');

// HubSpot sends webhooks as an array of events
router.post('/', async (req, res) => {
    try {
        // HubSpot expects a 200 response quickly
        res.status(200).send('OK');

        // Log raw payload for debugging
        console.log(`\n⚡ [${new Date().toISOString()}] HubSpot Webhook received`);
        console.log('   📦 Raw payload:', JSON.stringify(req.body, null, 2));

        const events = Array.isArray(req.body) ? req.body : [req.body];

        console.log(`   📊 Processing ${events.length} event(s)`);

        for (const event of events) {
            await processHubSpotEvent(event);
        }
    } catch (error) {
        console.error('❌ HubSpot webhook error:', error);
        // Still return 200 to prevent HubSpot from retrying
    }
});

// Test endpoint to verify lead saving works (POST creates a test lead)
router.post('/test', async (req, res) => {
    try {
        console.log('\n🧪 Testing lead creation...');

        const testLead = new Lead({
            hubspotId: 'test-' + Date.now(),
            firstName: 'Test',
            lastName: 'User',
            email: 'test-' + Date.now() + '@example.com',
            phone: '+1234567890',
            source: 'manual',
            status: 'new'
        });

        const saved = await testLead.save();
        console.log('   ✅ Test lead saved with ID:', saved._id);

        // Verify it exists
        const verify = await Lead.findById(saved._id);
        console.log('   ✅ Verified lead exists:', !!verify);

        // Count total
        const total = await Lead.countDocuments();
        console.log('   📊 Total leads in database:', total);

        res.json({
            success: true,
            leadId: saved._id,
            verified: !!verify,
            totalLeads: total
        });
    } catch (error) {
        console.error('❌ Test lead error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Debug endpoint to check database state (GET - no auth required)
router.get('/debug', async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const total = await Lead.countDocuments();
        const latest = await Lead.find().sort({ createdAt: -1 }).limit(5);

        console.log('\n🔍 HubSpot Webhook Debug');
        console.log('   MongoDB state:', mongoose.connection.readyState);
        console.log('   Database name:', mongoose.connection.name);
        console.log('   Total leads:', total);

        res.json({
            mongoState: mongoose.connection.readyState,
            mongoStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState],
            databaseName: mongoose.connection.name,
            totalLeads: total,
            latestLeads: latest.map(l => ({
                id: l._id,
                hubspotId: l.hubspotId,
                name: `${l.firstName} ${l.lastName}`,
                email: l.email,
                createdAt: l.createdAt
            }))
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ error: error.message });
    }
});

async function processHubSpotEvent(event) {
    const { subscriptionType, objectId } = event;
    
    console.log(`   📌 Event: ${subscriptionType} | Contact ID: ${objectId}`);
    
    // Only process contact.creation events - always create a new lead
    if (subscriptionType === 'contact.creation') {
        await fetchAndSaveContact(objectId);
    }
    // Ignore property change events - we only care about new contacts
}

async function fetchAndSaveContact(contactId) {
    try {
        const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
        if (!accessToken) {
            console.error('   ❌ No HUBSPOT_ACCESS_TOKEN configured');
            return;
        }

        const properties = [
            'email', 'phone', 'lastname', 'firstname', 'mobilephone',
            'hs_object_id', 'community_project_name', 'community_preference',
            'createdate', 'lastmodifieddate', 'hs_lead_status', 'lifecyclestage'
        ].join(',');

        const response = await fetch(
            `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?properties=${properties}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            console.error(`   ❌ Failed to fetch contact ${contactId}: ${response.status}`);
            return;
        }

        const contact = await response.json();
        const props = contact.properties;

        console.log(`   📋 Creating lead with data:`, {
            hubspotId: contactId.toString(),
            firstName: props.firstname,
            lastName: props.lastname,
            email: props.email
        });

        // Always create new lead - no duplicate checking
        const newLead = new Lead({
            hubspotId: contactId.toString(),
            firstName: props.firstname || '',
            lastName: props.lastname || '',
            email: props.email || '',
            phone: props.phone || '',
            mobilePhone: props.mobilephone || '',
            projectName: props.community_preference || props.community_project_name || '',
            leadStatus: props.hs_lead_status || '',
            lifecycleStage: props.lifecyclestage || '',
            source: 'hubspot_webhook',
            status: 'new',
            rawData: props
        });

        const savedLead = await newLead.save();
        console.log(`   ✅ New lead saved with ID: ${savedLead._id}`);
        console.log(`   ✅ Lead details: ${props.firstname} ${props.lastname} (${props.email})`);

        // Verify the lead was saved by querying it back
        const verifyLead = await Lead.findById(savedLead._id);
        if (verifyLead) {
            console.log(`   ✅ Lead verified in database: ${verifyLead._id}`);
        } else {
            console.error(`   ❌ Lead NOT found after save! ID: ${savedLead._id}`);
        }

        // Log total leads count
        const totalLeads = await Lead.countDocuments();
        console.log(`   📊 Total leads in database: ${totalLeads}`);

    } catch (error) {
        console.error(`   ❌ Error saving lead ${contactId}:`, error.message);
        console.error(`   ❌ Full error:`, error);
    }
}

module.exports = router;
