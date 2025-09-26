// Background service worker for MeetNote extension
class MeetNoteAPI {
  constructor() {
    this.apiUrl = 'https://meetnote.onrender.com';
    this.currentRecording = null;
    this.init();
  }

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
        chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
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
      switch (message.type) {
        case 'START_RECORDING':
          console.log('🎬 Attempting to start recording with data:', message.data);
          const recordingResult = await this.startRecording(message.data, sender.tab);
          console.log('✅ Recording started successfully:', recordingResult);
          sendResponse({ success: true, data: recordingResult });
          break;
          
        case 'STOP_RECORDING':
          console.log('⏹️ Attempting to stop recording');
          const stopResult = await this.stopRecording(message.data);
          console.log('✅ Recording stopped successfully:', stopResult);
          sendResponse({ success: true, data: stopResult });
          break;
          
        case 'CREATE_HIGHLIGHT':
          console.log('✨ Creating highlight:', message.data);
          const highlightResult = await this.createHighlight(message.data);
          sendResponse({ success: true, data: highlightResult });
          break;
          
        case 'GET_AUTH_STATUS':
          console.log('🔐 Checking auth status');
          const authStatus = await this.getAuthStatus();
          console.log('📋 Auth status result:', authStatus);
          sendResponse(authStatus);
          break;
          
        case 'CHECK_AUTH':
          console.log('🔐 Quick auth check');
          const quickAuthStatus = await this.getAuthStatus();
          console.log('📋 Quick auth check result:', quickAuthStatus);
          sendResponse(quickAuthStatus);
          break;
          
        case 'AUTHENTICATE':
          console.log('🔑 Authenticating user:', message.data?.email);
          try {
            const authResult = await this.authenticate(message.data);
            sendResponse({ success: true, data: authResult });
          } catch (error) {
            console.error('❌ Authentication failed in handler:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;
          
        case 'GET_SETTINGS':
          console.log('⚙️ Getting settings');
          const settings = await chrome.storage.sync.get('settings');
          sendResponse(settings.settings);
          break;
          
        case 'UPDATE_SETTINGS':
          console.log('💾 Updating settings:', message.data);
          await chrome.storage.sync.set({ settings: message.data });
          sendResponse({ success: true });
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
          sendResponse({ success: true });
          break;
          
        default:
          console.warn('⚠️ Unknown message type:', message.type);
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      console.error('📋 Error details:', {
        message: error.message,
        stack: error.stack,
        originalMessage: message
      });
      sendResponse({ error: error.message, details: error.stack });
    }

    return true; // Keep message channel open for async response
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

  async startRecording(data, tab) {
    console.log('🎬 Starting recording process...');
    console.log('📋 Recording data:', data);
    console.log('🌐 Tab info:', { url: tab?.url, title: tab?.title });

    try {
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
        title: data.title || `Meeting on ${data.platform}`,
        platform: data.platform,
        meetingUrl: tab.url,
        meetingId: data.meetingId,
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
      
      this.currentRecording = meeting.data || meeting;

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
    try {
      if (!this.currentRecording) {
        throw new Error('No active recording');
      }

      const { apiToken } = await chrome.storage.sync.get('apiToken');
      
      const response = await fetch(`${this.apiUrl}/api/meetings/${this.currentRecording.id}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        },
        body: JSON.stringify({
          endTime: new Date().toISOString(),
          duration: data.duration
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to stop recording: ${response.statusText}`);
      }

      const result = await response.json();
      this.currentRecording = null;

      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon.svg',
        title: 'MeetNote Recording Stopped',
        message: 'Processing recording and generating insights...'
      });

      return result.data;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  async createHighlight(data) {
    try {
      if (!this.currentRecording) {
        throw new Error('No active recording');
      }

      const { apiToken } = await chrome.storage.sync.get('apiToken');
      
      const response = await fetch(`${this.apiUrl}/api/highlights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        },
        body: JSON.stringify({
          meetingId: this.currentRecording.id,
          timestamp: data.timestamp,
          text: data.text,
          duration: data.duration || 30
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create highlight: ${response.statusText}`);
      }

      const highlight = await response.json();
      
      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon.svg',
        title: 'Highlight Created',
        message: 'Highlight saved successfully'
      });

      return highlight.data;
    } catch (error) {
      console.error('Failed to create highlight:', error);
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