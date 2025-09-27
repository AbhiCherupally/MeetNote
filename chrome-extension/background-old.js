// Background service worker for MeetNote extension
class MeetNoteBackgroundService {
  constructor() {
    this.apiUrl = 'http://localhost:8000'; // Python FastAPI backend
    this.isRecording = false;
    this.activeSocket = null;
    this.currentMeetingId = null;
    this.audioRecorder = null;
    this.currentRecordingData = null;
    this.mediaStream = null;

  init() {
    try {
      console.log('MeetNote background service worker initializing...');
      
      // Extension installation/update handler
      if (chrome.runtime && chrome.runtime.onInstalled) {
        chrome.runtime.onInstalled.addListener(this.handleInstalled.bind(this));
      }
      
      // Tab update listener for meeting detection
      if (chrome.tabs && chrome.tabs.onUpdated) {
        chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
      }
      
      // Message listener for content script communication
      if (chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          // Handle async responses properly in Manifest V3
          this.handleMessage(message, sender, sendResponse);
          return true; // Keep message channel open for async response
        });
      }
      
      // Command listener for keyboard shortcuts
      if (chrome.commands && chrome.commands.onCommand) {
        chrome.commands.onCommand.addListener(this.handleCommand.bind(this));
      }
      
      // Context menu creation
      this.createContextMenus();
      
      console.log('✅ MeetNote background service worker initialized successfully');
      
      // Test API connectivity
      this.testAPIConnection();
    } catch (error) {
      console.error('❌ Failed to initialize MeetNote background script:', error);
    }
  }

  async testAPIConnection() {
    try {
      console.log('🔗 Testing API connection to:', this.apiUrl);
      const response = await fetch(`${this.apiUrl}/health`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API connection successful:', data);
      } else {
        console.error('❌ API connection failed:', response.status);
      }
    } catch (error) {
      console.error('❌ API connection error:', error);
    }
  }

  async handleInstalled(details) {
    if (details.reason === 'install') {
      // First time installation
      await this.initializeExtension();
      chrome.tabs.create({ url: 'options.html' });
    } else if (details.reason === 'update') {
      // Extension update
      console.log('MeetNote extension updated to version:', chrome.runtime.getManifest().version);
    }
  }

  async initializeExtension() {
    try {
      // Set default settings
      await chrome.storage.sync.set({
        settings: {
          autoRecord: false,
          overlayPosition: 'bottom-right',
          transcriptLanguage: 'en-US',
          autoHighlight: true,
          notifications: true
        },
        user: null,
        apiToken: null
      });
      
      console.log('Extension initialized with default settings');
    } catch (error) {
      console.error('Failed to initialize extension:', error);
    }
  }

  async handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url) {
      const meetingInfo = this.detectMeetingPlatform(tab.url);
      
      if (meetingInfo) {
        console.log('Meeting platform detected:', meetingInfo);
        
        // Update extension badge
        await this.updateBadge(tabId, meetingInfo.platform);
        
        // Inject content script if not already injected
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
          });
        } catch (error) {
          console.log('Content script already injected or failed:', error);
        }
        
        // Send meeting detection notification to content script
        chrome.tabs.sendMessage(tabId, {
          type: 'MEETING_DETECTED',
          platform: meetingInfo.platform,
          meetingId: meetingInfo.meetingId,
          url: tab.url
        });
      }
    }
  }

  detectMeetingPlatform(url) {
    const patterns = {
      zoom: {
        pattern: /zoom\.us\/j\/(\d+)/,
        name: 'Zoom'
      },
      'google-meet': {
        pattern: /meet\.google\.com\/([a-z-]+)/,
        name: 'Google Meet'
      },
      teams: {
        pattern: /teams\.microsoft\.com/,
        name: 'Microsoft Teams'
      },
      webex: {
        pattern: /webex\.com/,
        name: 'Webex'
      }
    };

    for (const [platform, config] of Object.entries(patterns)) {
      const match = url.match(config.pattern);
      if (match) {
        return {
          platform,
          name: config.name,
          meetingId: match[1] || null,
          url
        };
      }
    }

    return null;
  }

  async updateBadge(tabId, platform) {
    const colors = {
      zoom: '#2D8CFF',
      'google-meet': '#34A853',
      teams: '#6264A7',
      webex: '#00BCF2'
    };

    await chrome.action.setBadgeText({
      text: '●',
      tabId: tabId
    });

    await chrome.action.setBadgeBackgroundColor({
      color: colors[platform] || '#666666',
      tabId: tabId
    });
  }

  async handleMessage(message, sender, sendResponse) {
    console.log('🔥 Background received message:', message);

    try {
      let result;
      
      switch (message.type) {
        case 'START_RECORDING':
          console.log('🎬 Attempting to start recording with data:', message.data);
          result = await this.startRecording(message.data, sender.tab);
          console.log('✅ Recording started successfully:', result);
          sendResponse({ success: true, data: result });
          break;
          
        case 'STOP_RECORDING':
          console.log('⏹️ Attempting to stop REAL recording');
          result = await this.stopRealRecording(message.data);
          console.log('✅ REAL Recording stopped successfully:', result);
          sendResponse({ success: true, data: result });
          break;
          
        case 'CREATE_HIGHLIGHT':
          try {
            console.log('✨ Creating highlight:', message.data);
            result = await this.createHighlight(message.data);
            sendResponse({ success: true, data: result });
          } catch (error) {
            console.error('❌ CREATE_HIGHLIGHT error:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;
          
        case 'GET_AUTH_STATUS':
          console.log('🔐 Checking auth status');
          result = await this.getAuthStatus();
          console.log('📋 Auth status result:', result);
          sendResponse(result);
          break;
          
        case 'CHECK_AUTH':
          console.log('🔐 Quick auth check');
          result = await this.getAuthStatus();
          console.log('📋 Quick auth check result:', result);
          return quickAuthStatus;
          break;
          
        case 'AUTHENTICATE':
          console.log('🔑 Authenticating user:', message.data?.email);
          try {
            const authResult = await this.authenticate(message.data);
            console.log('✅ Auth result from authenticate method:', authResult);
            // Ensure the response format matches what popup expects
            const response = { success: true, data: authResult };
            console.log('✅ Sending response to popup:', response);
            return response;
          } catch (error) {
            console.error('❌ Authentication failed in handler:', error);
            return { success: false, error: error.message };
          }
          
        case 'GET_SETTINGS':
          console.log('⚙️ Getting settings');
          const settings = await chrome.storage.sync.get('settings');
          return settings.settings;
          break;
          
        case 'UPDATE_SETTINGS':
          console.log('💾 Updating settings:', message.data);
          await chrome.storage.sync.set({ settings: message.data });
          return { success: true };
          break;
          
        case 'OPEN_POPUP':
          console.log('🪟 Opening extension popup');
          // In Manifest V3, we can't programmatically open popup, 
          // but we can show a notification to remind user to click extension icon
          if (chrome.notifications) {
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icons/icon48.png',
              title: 'MeetNote Login Required',
              message: 'Please click the MeetNote extension icon to log in before recording meetings.'
            });
          }
          return { success: true };
          break;
          
        default:
          console.warn('⚠️ Unknown message type:', message.type);
          return { error: 'Unknown message type' };
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      console.error('📋 Error details:', {
        message: error.message,
        stack: error.stack,
        originalMessage: message
      });
      return { error: error.message, details: error.stack };
    }
  }

  async handleCommand(command) {
    console.log('Command received:', command);
    
    // Get active tab
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!activeTab) return;

    // Send command to content script
    chrome.tabs.sendMessage(activeTab.id, {
      type: 'KEYBOARD_COMMAND',
      command: command
    });
  }

  createContextMenus() {
    try {
      if (chrome.contextMenus) {
        chrome.contextMenus.removeAll(() => {
          chrome.contextMenus.create({
            id: 'meetnote-start-recording',
            title: 'Start Recording with MeetNote',
            contexts: ['page']
          });

          chrome.contextMenus.create({
            id: 'meetnote-create-highlight',
            title: 'Create Highlight',
            contexts: ['selection']
          });
        });

        chrome.contextMenus.onClicked.addListener(async (info, tab) => {
          try {
            switch (info.menuItemId) {
              case 'meetnote-start-recording':
                chrome.tabs.sendMessage(tab.id, { type: 'START_RECORDING_CONTEXT' });
                break;
              case 'meetnote-create-highlight':
                chrome.tabs.sendMessage(tab.id, {
                  type: 'CREATE_HIGHLIGHT_CONTEXT',
                  selectedText: info.selectionText
                });
                break;
            }
          } catch (error) {
            console.error('Context menu error:', error);
          }
        });
      } else {
        console.log('Context menus not available in this environment');
      }
    } catch (error) {
      console.error('Failed to create context menus:', error);
    }
  }

  async startRecording(data, senderTab) {
    console.log('🎬 Starting recording process...');
    console.log('📋 Recording data:', data);
    console.log('🌐 Sender tab info:', { url: senderTab?.url, title: senderTab?.title });

    try {
      // Get tab information - either from sender or current active tab
      let activeTab = senderTab;
      
      if (!activeTab || !activeTab.url) {
        console.log('🔍 No sender tab, getting active tab...');
        try {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          activeTab = tabs[0];
          console.log('📋 Active tab found:', { url: activeTab?.url, title: activeTab?.title });
        } catch (tabError) {
          console.error('❌ Failed to get active tab:', tabError);
          throw new Error('Unable to access tab information. Please ensure you are on a meeting page.');
        }
      }
      
      if (!activeTab || !activeTab.url) {
        console.error('❌ No valid tab found');
        throw new Error('No active tab found. Please ensure you are on a meeting page.');
      }

      // Check authentication first
      console.log('🔐 Checking authentication...');
      const { apiToken } = await chrome.storage.sync.get('apiToken');
      console.log('🔑 API Token status:', apiToken ? 'Found' : 'Missing');
      
      if (!apiToken) {
        console.error('❌ No API token found - user not authenticated');
        throw new Error('Not authenticated - please sign in to the extension first');
      }

      console.log('🌐 Making API request to start recording...');
      const requestBody = {
        title: data?.title || `Meeting on ${data?.platform || 'Unknown Platform'}`,
        platform: data?.platform || 'unknown',
        meetingUrl: activeTab.url || 'unknown',
        meetingId: data?.meetingId || null,
        startTime: new Date().toISOString()
      };
      console.log('📤 Request body:', requestBody);

      const response = await fetch(`${this.apiUrl}/api/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 API Response status:', response.status);
      console.log('📥 API Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`Failed to start recording: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const meeting = await response.json();
      console.log('✅ Meeting created successfully:', meeting);
      
      // Store recording with proper ID handling
      this.currentRecording = {
        id: meeting.id || meeting.data?.id || meeting._id,
        title: meeting.title || meeting.data?.title,
        platform: meeting.platform || meeting.data?.platform,
        startTime: meeting.startTime || meeting.data?.startTime,
        ...(meeting.data || meeting)
      };
      
      console.log('📋 Stored recording object:', this.currentRecording);

      // Show success notification
      if (chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon.svg',
          title: 'MeetNote Recording Started',
          message: `Recording "${this.currentRecording.title}" in progress`
        });
      }

      console.log('🎉 Recording started successfully!');
      return this.currentRecording;

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      console.error('📋 Full error details:', {
        message: error.message,
        stack: error.stack,
        apiUrl: this.apiUrl,
        tabUrl: tab?.url,
        platform: data?.platform
      });
      
      // Show error notification
      if (chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon.svg',
          title: 'Recording Failed',
          message: error.message
        });
      }
      
      throw error;
    }
  }

  async stopRecording(data) {
    console.log('⏹️ Starting stop recording process...');
    console.log('📋 Stop recording data:', data);
    console.log('🎬 Current recording:', this.currentRecording);
    
    try {
      if (!this.currentRecording) {
        console.warn('⚠️ No active recording found');
        return {
          success: true,
          message: 'No active recording to stop',
          recording: null
        };
      }

      // Validate recording has ID
      if (!this.currentRecording.id) {
        console.error('❌ Recording missing ID:', this.currentRecording);
        // Try to find ID in other fields
        const recordingId = this.currentRecording._id || 
                           this.currentRecording.meetingId ||
                           this.currentRecording.recordingId;
        
        if (recordingId) {
          this.currentRecording.id = recordingId;
          console.log('✅ Found ID in alternate field:', recordingId);
        } else {
          console.warn('⚠️ No recording ID found - will clear recording state');
          this.currentRecording = null;
          return {
            success: true,
            message: 'Recording cleared due to missing ID',
            recording: null
          };
        }
      }

      // Check authentication
      const { apiToken } = await chrome.storage.sync.get('apiToken');
      if (!apiToken) {
        throw new Error('Not authenticated - please sign in first');
      }
      
      console.log('🌐 Making API request to stop recording...');
      console.log('🔑 Using recording ID:', this.currentRecording.id);
      
      const requestBody = {
        endTime: new Date().toISOString(),
        duration: data?.duration || 0
      };
      console.log('📤 Stop request body:', requestBody);
      
      const response = await fetch(`${this.apiUrl}/api/meetings/${this.currentRecording.id}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Stop recording response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Stop recording API error:', errorText);
        throw new Error(`Failed to stop recording: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Recording stopped successfully:', result);
      
      // Clear current recording
      const stoppedRecording = this.currentRecording;
      this.currentRecording = null;

      // Show notification
      if (chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'MeetNote Recording Stopped',
          message: 'Processing recording and generating insights...'
        });
      }

      return {
        success: true,
        recording: result.data || result,
        stoppedRecording: stoppedRecording
      };
    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      console.error('📋 Stop recording error details:', {
        message: error.message,
        stack: error.stack,
        currentRecording: this.currentRecording,
        apiUrl: this.apiUrl
      });
      throw error;
    }
  }

  async createHighlight(data) {
    console.log('✨ Creating highlight with data:', data);
    console.log('📋 Current recording:', this.currentRecording);
    
    try {
      if (!this.currentRecording) {
        throw new Error('No active recording - please start recording first');
      }

      if (!this.currentRecording.id) {
        console.error('❌ Recording missing ID for highlight creation');
        throw new Error('Recording ID missing - cannot create highlight');
      }

      const { apiToken } = await chrome.storage.sync.get('apiToken');
      if (!apiToken) {
        throw new Error('Not authenticated - please sign in first');
      }
      
      console.log('🌐 Making API request to create highlight...');
      const requestBody = {
        meetingId: this.currentRecording.id,
        timestamp: data?.timestamp || 0,
        text: data?.text || 'Manual highlight created',
        duration: data?.duration || 30
      };
      console.log('📤 Highlight request body:', requestBody);
      
      const response = await fetch(`${this.apiUrl}/api/highlights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Highlight response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Highlight API error:', errorText);
        throw new Error(`Failed to create highlight: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const highlight = await response.json();
      console.log('✅ Highlight created successfully:', highlight);
      
      // Show notification
      if (chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Highlight Created',
          message: 'Highlight saved successfully'
        });
      }

      return highlight.data || highlight;
    } catch (error) {
      console.error('❌ Failed to create highlight:', error);
      console.error('📋 Highlight error details:', {
        message: error.message,
        stack: error.stack,
        currentRecording: this.currentRecording,
        data: data
      });
      throw error;
    }
  }

  async getAuthStatus() {
    try {
      console.log('🔐 Checking auth status...');
      
      const result = await chrome.storage.sync.get(['apiToken', 'user']);
      console.log('📋 Storage check:', { 
        hasToken: !!result.apiToken, 
        hasUser: !!result.user 
      });
      
      if (!result.apiToken || !result.user) {
        console.log('❌ No token or user found in storage');
        return { authenticated: false };
      }

      console.log('✅ User authenticated:', result.user);
      return { 
        authenticated: true, 
        user: result.user 
      };
    } catch (error) {
      console.error('❌ Failed to check auth status:', error);
      return { authenticated: false };
    }
  }

  async authenticate(credentials) {
    try {
      console.log('🔐 Authenticating with credentials:', { email: credentials.email });
      
      const response = await fetch(`${this.apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      console.log('📥 Auth response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Auth error response:', errorText);
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      const auth = await response.json();
      console.log('✅ Auth successful:', { success: auth.success, user: auth.user });
      
      // Store token and user info - backend returns token and user directly, not nested under data
      await chrome.storage.sync.set({
        apiToken: auth.token,
        user: auth.user
      });

      return {
        token: auth.token,
        user: auth.user
      };
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      throw error;
    }
  }
}

// Initialize the background service
new MeetNoteAPI();