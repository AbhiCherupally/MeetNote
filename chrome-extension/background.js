// MeetNote Chrome Extension Background Service Worker
// Connects to Python FastAPI backend for real-time transcription

class MeetNoteBackgroundService {
  constructor() {
    // Use your actual new Render deployment URL
    this.apiUrl = 'https://meetnote-backend.onrender.com'; // Your new Python backend
    this.wsUrl = 'wss://meetnote-backend.onrender.com/ws'; // Your new WebSocket URL
    
    // For development, uncomment these lines:
    // this.apiUrl = 'http://localhost:8000';
    // this.wsUrl = 'ws://localhost:8000/ws';
    
    this.isRecording = false;
    this.activeSocket = null;
    this.currentMeetingId = null;
    this.audioRecorder = null;
    this.currentRecordingData = null;
    this.mediaStream = null;
    this.clientId = this.generateClientId();
    
    this.init();
  }

  generateClientId() {
    return 'client_' + Math.random().toString(36).substr(2, 9);
  }

  init() {
    console.log('🚀 MeetNote Background Service initializing...');
    
    // Extension event listeners
    if (chrome.runtime && chrome.runtime.onInstalled) {
      chrome.runtime.onInstalled.addListener(this.handleInstalled.bind(this));
    }
    
    if (chrome.tabs && chrome.tabs.onUpdated) {
      chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
    }
    
    // Message listener for content script communication
    if (chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        this.handleMessage(message, sender, sendResponse);
        return true; // Keep message channel open for async response
      });
    }
    
    // Command listener for keyboard shortcuts
    if (chrome.commands && chrome.commands.onCommand) {
      chrome.commands.onCommand.addListener(this.handleCommand.bind(this));
    }

    // Test API connection
    this.testAPIConnection();
  }

  async testAPIConnection() {
    try {
      const response = await fetch(`${this.apiUrl}/api/health`);
      if (response.ok) {
        const health = await response.json();
        console.log('✅ Backend connection successful:', health);
      } else {
        console.warn('⚠️ Backend health check failed:', response.status);
      }
    } catch (error) {
      console.warn('⚠️ Backend connection failed:', error.message);
      console.log('📝 Make sure Python backend is running on localhost:8000');
    }
  }

  async handleInstalled(details) {
    console.log('📦 Extension installed/updated:', details);
    await this.initializeExtension();
    this.createContextMenus();
  }

  async initializeExtension() {
    try {
      // Set default badge
      await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
      await chrome.action.setBadgeText({ text: 'OFF' });
      
      console.log('✅ Extension initialized successfully');
    } catch (error) {
      console.error('❌ Extension initialization failed:', error);
    }
  }

  async handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url) {
      const meetingInfo = this.detectMeetingPlatform(tab.url);
      
      if (meetingInfo) {
        console.log('🎥 Meeting platform detected:', meetingInfo);
        
        // Update extension badge
        await this.updateBadge(tabId, meetingInfo.platform);
        
        // Inject content script if not already injected
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
          });
        } catch (error) {
          console.log('Content script already injected or failed:', error.message);
        }
        
        // Send meeting detection notification to content script
        try {
          chrome.tabs.sendMessage(tabId, {
            type: 'MEETING_DETECTED',
            platform: meetingInfo.platform,
            meetingId: meetingInfo.meetingId,
            url: tab.url
          });
        } catch (error) {
          console.log('Failed to send meeting detection message:', error.message);
        }
      }
    }
  }

  detectMeetingPlatform(url) {
    const platforms = [
      { name: 'zoom', pattern: /zoom\.us\/j\//, extract: /\/j\/(\d+)/ },
      { name: 'meet', pattern: /meet\.google\.com\//, extract: /meet\.google\.com\/([a-z-]+)/ },
      { name: 'teams', pattern: /teams\.microsoft\.com\//, extract: /teams\.microsoft\.com.*\/([a-zA-Z0-9-]+)/ },
      { name: 'webex', pattern: /webex\.com\//, extract: /webex\.com.*\/([a-zA-Z0-9-]+)/ }
    ];

    for (const platform of platforms) {
      if (platform.pattern.test(url)) {
        const match = url.match(platform.extract);
        return {
          platform: platform.name,
          meetingId: match ? match[1] : null,
          url: url
        };
      }
    }
    
    return null;
  }

  async updateBadge(tabId, platform) {
    try {
      const platformColors = {
        'zoom': '#2D8CFF',
        'meet': '#34A853', 
        'teams': '#5B5FC7',
        'webex': '#00BCEB'
      };

      await chrome.action.setBadgeBackgroundColor({
        color: platformColors[platform] || '#4CAF50',
        tabId: tabId
      });
      
      await chrome.action.setBadgeText({
        text: platform.toUpperCase().substr(0, 4),
        tabId: tabId
      });
    } catch (error) {
      console.error('Failed to update badge:', error);
    }
  }

  async handleMessage(message, sender, sendResponse) {
    console.log('📨 Background received message:', message);

    try {
      let result;
      
      switch (message.type) {
        case 'LOGIN':
          console.log('🔐 Processing login with data:', message.data);
          result = await this.authenticateUser(message.data);
          sendResponse({ success: true, data: result });
          break;
          
        case 'AUTHENTICATE':
        case 'GET_AUTH_STATUS':
          console.log('🔐 Checking auth status');
          result = await this.getAuthStatus();
          sendResponse(result);
          break;
        case 'START_RECORDING':
          console.log('🎬 Starting real recording with data:', message.data);
          result = await this.startRealRecording(message.data, sender.tab);
          sendResponse({ success: true, data: result });
          break;
          
        case 'STOP_RECORDING':
          console.log('⏹️ Stopping real recording');
          result = await this.stopRealRecording(message.data);
          sendResponse({ success: true, data: result });
          break;
          
        case 'CREATE_HIGHLIGHT':
          console.log('✨ Creating highlight:', message.data);
          result = await this.createHighlight(message.data);
          sendResponse({ success: true, data: result });
          break;

        case 'GET_TAB_INFO':
          console.log('🌐 Getting tab info');
          result = await this.getActiveTabInfo();
          sendResponse({ success: true, data: result });
          break;
          
        default:
          console.warn('❓ Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('❌ Message handling error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async getActiveTabInfo() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      
      if (!activeTab) {
        throw new Error('No active tab found');
      }

      const meetingInfo = this.detectMeetingPlatform(activeTab.url);
      
      return {
        id: activeTab.id,
        url: activeTab.url,
        title: activeTab.title,
        meetingInfo: meetingInfo
      };
    } catch (error) {
      console.error('Failed to get tab info:', error);
      throw error;
    }
  }

  async startRealRecording(data, senderTab) {
    console.log('🎬 Starting real recording process...');

    try {
      // Get tab information
      const tabInfo = senderTab || await this.getActiveTabInfo();
      
      if (!tabInfo || !tabInfo.url) {
        throw new Error('Unable to access tab information. Please ensure you are on a meeting page.');
      }

      // Check authentication
      const authStatus = await this.getAuthStatus();
      if (!authStatus.authenticated) {
        throw new Error('Not authenticated. Please sign in to the extension first.');
      }

      // Create meeting in backend
      const meetingData = {
        title: data?.title || `Meeting on ${data?.platform || 'Unknown Platform'}`,
        platform: data?.platform || 'unknown',
        meeting_url: tabInfo.url,
        meeting_id: data?.meetingId || null,
        start_time: new Date().toISOString()
      };

      console.log('📤 Creating meeting:', meetingData);
      
      const response = await fetch(`${this.apiUrl}/api/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStatus.token}`
        },
        body: JSON.stringify(meetingData)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create meeting: ${error}`);
      }

      const meetingResult = await response.json();
      this.currentMeetingId = meetingResult.meeting.id;
      
      console.log('✅ Meeting created:', meetingResult.meeting);

      // Connect WebSocket for real-time transcription
      await this.connectWebSocket();
      
      // Start audio capture
      await this.startAudioCapture(tabInfo.id);

      this.isRecording = true;
      this.currentRecordingData = meetingResult.meeting;

      // Update badge
      await chrome.action.setBadgeText({ text: 'REC' });
      await chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });

      return {
        success: true,
        meeting: meetingResult.meeting,
        message: 'Real recording started successfully'
      };

    } catch (error) {
      console.error('❌ Failed to start real recording:', error);
      throw error;
    }
  }

  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.wsUrl}/${this.clientId}`;
        console.log('🔌 Connecting to WebSocket:', wsUrl);
        
        this.activeSocket = new WebSocket(wsUrl);

        this.activeSocket.onopen = () => {
          console.log('✅ WebSocket connected');
          
          // Join meeting room
          if (this.currentMeetingId) {
            this.activeSocket.send(JSON.stringify({
              type: 'join-meeting',
              meetingId: this.currentMeetingId
            }));
          }
          
          resolve();
        };

        this.activeSocket.onmessage = (event) => {
          const message = JSON.parse(event.data);
          console.log('📨 WebSocket message:', message);
          
          // Forward transcript updates to content script
          if (message.type === 'transcript-update') {
            this.broadcastToContentScripts({
              type: 'TRANSCRIPT_UPDATE',
              data: message
            });
          }
        };

        this.activeSocket.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject(error);
        };

        this.activeSocket.onclose = () => {
          console.log('🔌 WebSocket closed');
          this.activeSocket = null;
        };

      } catch (error) {
        console.error('❌ WebSocket connection failed:', error);
        reject(error);
      }
    });
  }

  async startAudioCapture(tabId) {
    try {
      // Request screen capture with audio
      const stream = await chrome.tabCapture.capture({
        audio: true,
        video: false
      });

      if (!stream) {
        throw new Error('Failed to capture tab audio');
      }

      this.mediaStream = stream;
      console.log('🎤 Audio capture started');

      // Set up audio processing
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (event) => {
        if (this.activeSocket && this.activeSocket.readyState === WebSocket.OPEN) {
          const audioData = event.inputBuffer.getChannelData(0);
          
          // Convert to base64 and send to backend
          const audioArray = new Float32Array(audioData);
          const base64Audio = this.arrayBufferToBase64(audioArray.buffer);
          
          this.activeSocket.send(JSON.stringify({
            type: 'audio-data',
            audioData: base64Audio
          }));
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      // Start real-time transcription
      if (this.activeSocket && this.activeSocket.readyState === WebSocket.OPEN) {
        this.activeSocket.send(JSON.stringify({
          type: 'start-transcription',
          meetingId: this.currentMeetingId
        }));
      }

    } catch (error) {
      console.error('❌ Audio capture failed:', error);
      throw error;
    }
  }

  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async stopRealRecording(data) {
    console.log('⏹️ Stopping real recording...');

    try {
      // Stop transcription
      if (this.activeSocket && this.activeSocket.readyState === WebSocket.OPEN) {
        this.activeSocket.send(JSON.stringify({
          type: 'stop-transcription'
        }));
        this.activeSocket.close();
      }

      // Stop audio capture
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }

      // Update meeting in backend
      if (this.currentMeetingId) {
        const authStatus = await this.getAuthStatus();
        
        const response = await fetch(`${this.apiUrl}/api/meetings/${this.currentMeetingId}/stop`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authStatus.token}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Meeting stopped:', result.meeting);
        }
      }

      // Reset state
      this.isRecording = false;
      this.currentMeetingId = null;
      this.currentRecordingData = null;
      this.activeSocket = null;

      // Update badge
      await chrome.action.setBadgeText({ text: 'OFF' });
      await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });

      return {
        success: true,
        message: 'Real recording stopped successfully'
      };

    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      throw error;
    }
  }

  async createHighlight(data) {
    try {
      if (!this.currentMeetingId) {
        throw new Error('No active recording');
      }

      const authStatus = await this.getAuthStatus();
      
      const response = await fetch(`${this.apiUrl}/api/meetings/${this.currentMeetingId}/highlights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStatus.token}`
        },
        body: JSON.stringify({
          meeting_id: this.currentMeetingId,
          text: data.text,
          timestamp: data.timestamp || new Date().toISOString(),
          type: data.type || 'important'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create highlight: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✨ Highlight created:', result.highlight);
      
      return result;

    } catch (error) {
      console.error('❌ Failed to create highlight:', error);
      throw error;
    }
  }

  async authenticateUser({ email, password }) {
    console.log('🔐 Authenticating user:', { email, passwordLength: password.length });

    try {
      const response = await fetch(`${this.apiUrl}/api/auth/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Authentication failed: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Authentication successful:', result);

      if (result.success && result.token) {
        // Store the token
        await chrome.storage.sync.set({ apiToken: result.token });
        
        return {
          success: true,
          user: result.user,
          token: result.token,
          message: 'Authentication successful'
        };
      } else {
        throw new Error(result.message || 'Authentication failed');
      }

    } catch (error) {
      console.error('❌ Authentication failed:', error);
      throw error;
    }
  }

  async getAuthStatus() {
    try {
      const { apiToken } = await chrome.storage.sync.get('apiToken');
      
      if (!apiToken) {
        return {
          authenticated: false,
          user: null,
          message: 'Not authenticated'
        };
      }

      // Verify token with backend
      const response = await fetch(`${this.apiUrl}/api/auth/status`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        return {
          authenticated: true,
          user: result.user,
          token: apiToken,
          message: 'Authenticated successfully'
        };
      } else {
        // Invalid token
        await chrome.storage.sync.remove('apiToken');
        return {
          authenticated: false,
          user: null,
          message: 'Invalid token'
        };
      }

    } catch (error) {
      console.error('❌ Auth status check failed:', error);
      return {
        authenticated: false,
        user: null,
        error: error.message
      };
    }
  }

  async handleCommand(command) {
    console.log('⌨️ Keyboard shortcut triggered:', command);
    
    switch (command) {
      case 'toggle-recording':
        if (this.isRecording) {
          await this.stopRealRecording();
        } else {
          const tabInfo = await this.getActiveTabInfo();
          if (tabInfo && tabInfo.meetingInfo) {
            await this.startRealRecording(tabInfo.meetingInfo, tabInfo);
          }
        }
        break;
    }
  }

  createContextMenus() {
    chrome.contextMenus.create({
      id: 'meetnote-start-recording',
      title: 'Start MeetNote Recording',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'meetnote-stop-recording', 
      title: 'Stop MeetNote Recording',
      contexts: ['page']
    });

    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
      if (info.menuItemId === 'meetnote-start-recording' && !this.isRecording) {
        const tabInfo = await this.getActiveTabInfo();
        if (tabInfo && tabInfo.meetingInfo) {
          await this.startRealRecording(tabInfo.meetingInfo, tabInfo);
        }
      } else if (info.menuItemId === 'meetnote-stop-recording' && this.isRecording) {
        await this.stopRealRecording();
      }
    });
  }

  async broadcastToContentScripts(message) {
    try {
      const tabs = await chrome.tabs.query({});
      
      for (const tab of tabs) {
        try {
          chrome.tabs.sendMessage(tab.id, message);
        } catch (error) {
          // Ignore tabs that don't have content script
        }
      }
    } catch (error) {
      console.error('Failed to broadcast to content scripts:', error);
    }
  }
}

// Initialize the background service
const meetNoteService = new MeetNoteBackgroundService();