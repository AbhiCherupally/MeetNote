// Background service worker for MeetNote extension
class MeetNoteBackground {
  constructor() {
    this.apiUrl = 'https://api.meetnote.app';
    this.currentRecording = null;
    this.init();
  }

  init() {
    // Extension installation/update handler
    chrome.runtime.onInstalled.addListener(this.handleInstalled.bind(this));
    
    // Tab update listener for meeting detection
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
    
    // Message listener for content script communication
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // Command listener for keyboard shortcuts
    chrome.commands.onCommand.addListener(this.handleCommand.bind(this));
    
    // Context menu creation
    this.createContextMenus();
    
    console.log('MeetNote background service worker initialized');
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
    console.log('Background received message:', message);

    try {
      switch (message.type) {
        case 'START_RECORDING':
          await this.startRecording(message.data, sender.tab);
          break;
          
        case 'STOP_RECORDING':
          await this.stopRecording(message.data);
          break;
          
        case 'CREATE_HIGHLIGHT':
          await this.createHighlight(message.data);
          break;
          
        case 'GET_AUTH_STATUS':
          const authStatus = await this.getAuthStatus();
          sendResponse(authStatus);
          break;
          
        case 'AUTHENTICATE':
          await this.authenticate(message.data);
          break;
          
        case 'GET_SETTINGS':
          const settings = await chrome.storage.sync.get('settings');
          sendResponse(settings.settings);
          break;
          
        case 'UPDATE_SETTINGS':
          await chrome.storage.sync.set({ settings: message.data });
          break;
          
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
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
    });
  }

  async startRecording(data, tab) {
    try {
      const { apiToken } = await chrome.storage.sync.get('apiToken');
      
      if (!apiToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${this.apiUrl}/api/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        },
        body: JSON.stringify({
          title: data.title || `Meeting on ${data.platform}`,
          platform: data.platform,
          meetingUrl: tab.url,
          meetingId: data.meetingId,
          startTime: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to start recording: ${response.statusText}`);
      }

      const meeting = await response.json();
      this.currentRecording = meeting.data;

      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'MeetNote Recording Started',
        message: `Recording "${meeting.data.title}" in progress`
      });

      return meeting.data;
    } catch (error) {
      console.error('Failed to start recording:', error);
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
        iconUrl: 'icons/icon48.png',
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
        iconUrl: 'icons/icon48.png',
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
      const { apiToken } = await chrome.storage.sync.get('apiToken');
      
      if (!apiToken) {
        return { authenticated: false };
      }

      const response = await fetch(`${this.apiUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });

      if (response.ok) {
        const user = await response.json();
        return { authenticated: true, user: user.data.user };
      } else {
        // Token is invalid, clear it
        await chrome.storage.sync.remove('apiToken');
        return { authenticated: false };
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
      return { authenticated: false };
    }
  }

  async authenticate(credentials) {
    try {
      const response = await fetch(`${this.apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const auth = await response.json();
      
      // Store token and user info
      await chrome.storage.sync.set({
        apiToken: auth.data.token,
        user: auth.data.user
      });

      return auth.data;
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }
}

// Initialize the background service
new MeetNoteBackground();