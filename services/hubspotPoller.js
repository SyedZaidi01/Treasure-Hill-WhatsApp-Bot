const axios = require('axios');
const Lead = require('../models/Lead');

class HubSpotPoller {
  constructor() {
    this.accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
    this.baseUrl = 'https://api.hubapi.com';
    this.pollingInterval = 10 * 60 * 1000; // 10 minutes
    this.isRunning = false;
    this.lastPollTime = null;
    
    // Properties to fetch (matching your current webhook)
    this.properties = [
      'email',
      'phone',
      'lastname',
      'firstname',
      'mobilephone',
      'hs_object_id',
      'community_project_name', // May need adjustment based on your actual property name
      'createdate',
      'lastmodifieddate',
      'hs_lead_status',
      'lifecyclestage'
    ];
  }

  /**
   * Start the polling service
   */
  start() {
    if (!this.accessToken) {
      console.error('❌ HUBSPOT_ACCESS_TOKEN not configured - HubSpot polling disabled');
      return;
    }

    if (this.isRunning) {
      console.log('⚠️  HubSpot poller already running');
      return;
    }

    this.isRunning = true;
    console.log('🔄 HubSpot Poller started - checking every 10 minutes');

    // Run immediately on start
    this.poll();

    // Then run every 10 minutes
    this.intervalId = setInterval(() => {
      this.poll();
    }, this.pollingInterval);
  }

  /**
   * Stop the polling service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 HubSpot Poller stopped');
  }

  /**
   * Poll HubSpot for new contacts
   */
  async poll() {
    try {
      console.log(`\n📡 [${new Date().toISOString()}] Polling HubSpot for new contacts...`);

      // Get the last processed timestamp from database
      const lastProcessed = await this.getLastProcessedTime();
      
      // Fetch contacts created or modified after last poll
      const contacts = await this.fetchRecentContacts(lastProcessed);

      if (contacts.length === 0) {
        console.log('   No new contacts found');
        return;
      }

      console.log(`   Found ${contacts.length} contact(s) to process`);

      // Process each contact
      let newCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      for (const contact of contacts) {
        const result = await this.processContact(contact);
        if (result === 'new') newCount++;
        else if (result === 'updated') updatedCount++;
        else skippedCount++;
      }

      console.log(`   ✅ Processed: ${newCount} new, ${updatedCount} updated, ${skippedCount} skipped`);

      // Update last poll time
      this.lastPollTime = new Date();

    } catch (error) {
      console.error('❌ HubSpot polling error:', error.message);
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', JSON.stringify(error.response.data));
      }
    }
  }

  /**
   * Fetch recent contacts from HubSpot
   */
  async fetchRecentContacts(since) {
    const allContacts = [];
    let after = undefined;
    let hasMore = true;

    // Calculate the filter date (use last poll time or last 24 hours for first run)
    const filterDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000);

    while (hasMore) {
      const response = await axios.get(`${this.baseUrl}/crm/v3/objects/contacts`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit: 100,
          after: after,
          properties: this.properties.join(','),
          // Sort by create date descending to get newest first
          sorts: JSON.stringify([{ propertyName: 'createdate', direction: 'DESCENDING' }])
        }
      });

      const { results, paging } = response.data;

      // Filter contacts created/modified after our last poll
      for (const contact of results) {
        const createDate = new Date(contact.properties.createdate);
        const modifiedDate = new Date(contact.properties.lastmodifieddate);
        
        // Include if created or modified after our filter date
        if (createDate > filterDate || modifiedDate > filterDate) {
          allContacts.push(contact);
        }
      }

      // Check if there are more pages
      if (paging?.next?.after) {
        after = paging.next.after;
      } else {
        hasMore = false;
      }

      // Safety limit - don't fetch more than 500 contacts in one poll
      if (allContacts.length >= 500) {
        console.log('   ⚠️  Reached 500 contact limit for this poll');
        hasMore = false;
      }
    }

    return allContacts;
  }

  /**
   * Process a single contact and save to database
   */
  async processContact(contact) {
    try {
      const hubspotId = contact.id;
      const properties = contact.properties;

      // Check if we already have this contact
      const existingLead = await Lead.findOne({ hubspotId: hubspotId });

      // Prepare lead data (matching your webhook structure)
      const leadData = {
        hubspotId: hubspotId,
        objectId: hubspotId, // Same as hubspotId for compatibility
        email: properties.email || '',
        phone: properties.phone || '',
        mobilePhone: properties.mobilephone || '',
        firstName: properties.firstname || '',
        lastName: properties.lastname || '',
        projectName: properties.community_project_name || properties.project_name || '',
        leadStatus: properties.hs_lead_status || '',
        lifecycleStage: properties.lifecyclestage || '',
        createdAt: new Date(properties.createdate),
        updatedAt: new Date(properties.lastmodifieddate),
        source: 'hubspot_poll',
        rawData: properties
      };

      if (existingLead) {
        // Check if actually modified
        const existingModified = existingLead.updatedAt?.getTime() || 0;
        const newModified = leadData.updatedAt.getTime();

        if (newModified > existingModified) {
          // Update existing lead
          await Lead.findByIdAndUpdate(existingLead._id, {
            ...leadData,
            processedAt: existingLead.processedAt // Keep original processed time
          });
          return 'updated';
        } else {
          return 'skipped';
        }
      } else {
        // Create new lead
        const newLead = new Lead({
          ...leadData,
          processedAt: null, // Not yet processed/called
          status: 'new'
        });
        await newLead.save();
        console.log(`   📥 New lead: ${leadData.firstName} ${leadData.lastName} (${leadData.email})`);
        return 'new';
      }

    } catch (error) {
      console.error(`   ❌ Error processing contact ${contact.id}:`, error.message);
      return 'error';
    }
  }

  /**
   * Get the last processed timestamp from database
   */
  async getLastProcessedTime() {
    try {
      // Find the most recently updated lead from HubSpot polling
      const lastLead = await Lead.findOne({ source: 'hubspot_poll' })
        .sort({ updatedAt: -1 })
        .limit(1);

      if (lastLead) {
        return lastLead.updatedAt;
      }

      // If no leads yet, return null (will use 24 hour default)
      return null;

    } catch (error) {
      console.error('Error getting last processed time:', error.message);
      return null;
    }
  }

  /**
   * Manual trigger for immediate poll (useful for testing)
   */
  async triggerPoll() {
    console.log('🔄 Manual poll triggered');
    await this.poll();
  }

  /**
   * Get polling status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastPollTime: this.lastPollTime,
      pollingInterval: this.pollingInterval / 1000 / 60 + ' minutes',
      accessTokenConfigured: !!this.accessToken
    };
  }

  /**
   * Test HubSpot connection
   */
  async testConnection() {
    try {
      const response = await axios.get(`${this.baseUrl}/crm/v3/objects/contacts`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit: 1
        }
      });

      return {
        success: true,
        message: 'HubSpot connection successful',
        totalContacts: response.data.total || 'Unknown'
      };

    } catch (error) {
      return {
        success: false,
        message: error.message,
        status: error.response?.status,
        error: error.response?.data
      };
    }
  }
}

module.exports = new HubSpotPoller();
