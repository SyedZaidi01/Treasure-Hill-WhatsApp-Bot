const axios = require('axios');
const Lead = require('../models/Lead');

class HubSpotPoller {
  constructor() {
    this.accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
    this.baseUrl = 'https://api.hubapi.com';
    this.pollingInterval = 5 * 60 * 1000; // 5 minutes
    this.isRunning = false;
    this.lastPollTime = null;
    this.intervalId = null;
    
    // Properties to fetch from HubSpot contacts
    this.properties = [
      'email',
      'phone',
      'lastname',
      'firstname',
      'mobilephone',
      'hs_object_id',
      'community_project_name',
      'community_preference',
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
      console.log('❌ HUBSPOT_ACCESS_TOKEN not configured');
      return false;
    }

    if (this.isRunning) {
      console.log('⚠️  HubSpot poller already running');
      return false;
    }

    this.isRunning = true;
    console.log('🔄 HubSpot Poller started - checking every 5 minutes');

    // Run immediately on start
    this.poll();

    // Then run every 5 minutes
    this.intervalId = setInterval(() => {
      this.poll();
    }, this.pollingInterval);

    return true;
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
    if (!this.accessToken) {
      return;
    }

    try {
      console.log(`\n📡 [${new Date().toISOString()}] Polling HubSpot for contacts...`);

      const contacts = await this.fetchRecentContacts();

      if (contacts.length === 0) {
        console.log('   No new contacts found');
        this.lastPollTime = new Date();
        return;
      }

      console.log(`   Found ${contacts.length} contact(s) to process`);

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
      this.lastPollTime = new Date();

    } catch (error) {
      console.error('❌ HubSpot polling error:', error.message);
      if (error.response) {
        console.error('   Status:', error.response.status);
        if (error.response.status === 401) {
          console.error('   ⚠️  Invalid or expired access token - check your HUBSPOT_ACCESS_TOKEN');
        }
      }
    }
  }

  /**
   * Fetch recent contacts from HubSpot
   */
  async fetchRecentContacts() {
    const allContacts = [];
    let after = undefined;
    let hasMore = true;

    // Get contacts created in the last 24 hours on first run, or since last poll
    const lastProcessedTime = await this.getLastProcessedTime();
    const filterDate = lastProcessedTime || new Date(Date.now() - 24 * 60 * 60 * 1000);

    while (hasMore) {
      const response = await axios.get(`${this.baseUrl}/crm/v3/objects/contacts`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit: 100,
          after: after,
          properties: this.properties.join(',')
        }
      });

      const { results, paging } = response.data;

      // Filter contacts created/modified after our filter date
      for (const contact of results) {
        const createDate = new Date(contact.properties.createdate);
        const modifiedDate = contact.properties.lastmodifieddate 
          ? new Date(contact.properties.lastmodifieddate) 
          : createDate;
        
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

      // Safety limit
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
      const props = contact.properties;

      // Check if we already have this contact
      const existingLead = await Lead.findOne({ hubspotId: hubspotId });

      // Prepare lead data
      const leadData = {
        hubspotId: hubspotId,
        objectId: hubspotId,
        email: props.email || '',
        phone: props.phone || '',
        mobilePhone: props.mobilephone || '',
        firstName: props.firstname || '',
        lastName: props.lastname || '',
        projectName: props.community_project_name || props.community_preference || '',
        leadStatus: props.hs_lead_status || '',
        lifecycleStage: props.lifecyclestage || '',
        source: 'hubspot_api',
        rawData: props
      };

      if (existingLead) {
        // Check if actually modified
        const existingModified = existingLead.updatedAt?.getTime() || 0;
        const newModified = props.lastmodifieddate 
          ? new Date(props.lastmodifieddate).getTime() 
          : Date.now();

        if (newModified > existingModified) {
          // Update existing lead but preserve processing status
          await Lead.findByIdAndUpdate(existingLead._id, {
            ...leadData,
            updatedAt: new Date(),
            // Preserve these fields
            status: existingLead.status,
            callStatus: existingLead.callStatus,
            callAttempts: existingLead.callAttempts,
            callNotes: existingLead.callNotes,
            processedAt: existingLead.processedAt
          });
          return 'updated';
        } else {
          return 'skipped';
        }
      } else {
        // Create new lead
        const newLead = new Lead({
          ...leadData,
          status: 'new',
          callStatus: 'pending',
          callAttempts: 0,
          createdAt: props.createdate ? new Date(props.createdate) : new Date(),
          updatedAt: new Date()
        });
        await newLead.save();
        console.log(`   📥 New lead: ${leadData.firstName} ${leadData.lastName} (${leadData.email || leadData.phone || 'no contact'})`);
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
      const lastLead = await Lead.findOne({ source: 'hubspot_api' })
        .sort({ updatedAt: -1 })
        .limit(1);

      return lastLead ? lastLead.updatedAt : null;
    } catch (error) {
      console.error('Error getting last processed time:', error.message);
      return null;
    }
  }

  /**
   * Manual trigger for immediate poll
   */
  async triggerPoll() {
    if (!this.accessToken) {
      console.log('⚠️  Cannot poll - HUBSPOT_ACCESS_TOKEN not configured');
      return { success: false, error: 'No access token' };
    }
    console.log('🔄 Manual poll triggered');
    await this.poll();
    return { success: true };
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
    if (!this.accessToken) {
      return {
        success: false,
        message: 'HUBSPOT_ACCESS_TOKEN not configured'
      };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/crm/v3/objects/contacts`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        params: { limit: 1 }
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
        status: error.response?.status
      };
    }
  }
}

module.exports = new HubSpotPoller();
