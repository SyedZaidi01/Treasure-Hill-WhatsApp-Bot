const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');

// HubSpot sends webhooks as an array of events
router.post('/', async (req, res) => {
    try {
        // HubSpot expects a 200 response quickly
        res.status(200).send('OK');
        
        const events = Array.isArray(req.body) ? req.body : [req.body];
        
        console.log(`\n⚡ [${new Date().toISOString()}] HubSpot Webhook received ${events.length} event(s)`);
        
        for (const event of events) {
            await processHubSpotEvent(event);
        }
    } catch (error) {
        console.error('❌ HubSpot webhook error:', error);
        // Still return 200 to prevent HubSpot from retrying
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
        
        await newLead.save();
        console.log(`   ✅ New lead saved: ${props.firstname} ${props.lastname} (${props.email})`);
        
    } catch (error) {
        console.error(`   ❌ Error saving lead ${contactId}:`, error.message);
    }
}

module.exports = router;
