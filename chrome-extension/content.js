// Content script for MeetNote extension - injected into meeting platforms
if (typeof window.meetNoteContentInitialized === 'undefined') {
  window.meetNoteContentInitialized = true;

class MeetNoteContent {
  constructor() {
    this.isRecording = false;
    this.transcriptOverlay = null;
    this.meetingObserver = null;
    this.init();
  }

  init() {
    console.log('MeetNote content script initialized on:', window.location.hostname);
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // Detect meeting platform and setup accordingly
    this.detectPlatform();
    
    // Start observing page changes
    this.startMeetingObserver();
  }

  detectPlatform() {
    const hostname = window.location.hostname;
    
    if (hostname.includes('zoom.us')) {
      this.platform = 'zoom';
      this.setupZoomIntegration();
    } else if (hostname.includes('meet.google.com')) {
      this.platform = 'google-meet';
      this.setupGoogleMeetIntegration();
    } else if (hostname.includes('teams.microsoft.com')) {
      this.platform = 'teams';
      this.setupTeamsIntegration();
    } else if (hostname.includes('webex.com')) {
      this.platform = 'webex';
      this.setupWebexIntegration();
    }
    
    console.log('✅ Platform detected:', this.platform);
    
    // Notify that meeting platform is detected
    if (this.platform) {
      const meetingInfo = this.detectMeetingFromUrl(window.location.href);
      if (meetingInfo) {
        console.log('✅ Meeting detected:', meetingInfo);
        this.showNotification(`MeetNote ready on ${meetingInfo.name}`, 'success');
      }
    }
  }

  handleMessage(message, sender, sendResponse) {
    console.log('Content script received message:', message);
    
    switch (message.type) {
      case 'REQUEST_SCREEN_CAPTURE':
        this.requestRealScreenCapture()
          .then(result => {
            console.log('✅ REAL screen capture successful:', result);
            sendResponse({ success: true, streamId: result.streamId, audioTracks: result.audioTracks });
          })
          .catch(error => {
            console.error('❌ REAL screen capture failed:', error);
            sendResponse({ success: false, error: error.message });
          });
        return true; // Keep message channel open
        
      case 'STOP_AUDIO_CAPTURE':
        this.stopAudioCapture();
        sendResponse({ success: true });
        break;
        
      case 'REAL_TRANSCRIPT_UPDATE':
        console.log('📝 Received REAL transcript update:', message.data);
        this.updateRealTranscriptOverlay(message.data);
        break;
        
      case 'MEETING_DETECTED':
        this.onMeetingDetected(message);
        break;
        
      case 'KEYBOARD_COMMAND':
        this.handleKeyboardCommand(message.command);
        break;

      case 'START_RECORDING_CONTEXT':
        this.startRecordingFromContext();
        break;
        
      case 'RECORDING_STARTED':
      case 'START_TRANSCRIPT':
        console.log('📄 Recording started - showing transcript overlay');
        this.showTranscriptOverlay();
        this.isRecording = true;
        break;
        
      case 'RECORDING_STOPPED':
      case 'STOP_TRANSCRIPT':
        console.log('📄 Recording stopped - keeping transcript overlay visible');
        this.isRecording = false;
        break;

      case 'TOGGLE_TRANSCRIPT':
        this.toggleTranscriptOverlay();
        break;
        
      case 'TRANSCRIPT_UPDATED':
      case 'UPDATE_TRANSCRIPT':
        console.log('📝 Updating transcript with new data:', message.transcript || message.data);
        this.updateTranscriptContent(message.transcript || message.data);
        break;

      default:
        console.log('⚠️ Unknown message type:', message.type);
    }
    
    sendResponse({ received: true });
  }  onMeetingDetected(message) {
    this.meetingInfo = {
      platform: message.platform,
      meetingId: message.meetingId,
      url: message.url
    };
    
    // Show subtle notification that extension is ready
    this.showNotification('MeetNote ready to record', 'success');
    
    // Inject recording controls if not already present
    this.injectRecordingControls();
  }

  handleKeyboardCommand(command) {
    switch (command) {
      case 'toggle-recording':
        this.toggleRecording();
        break;
      case 'create-highlight':
        this.createHighlight();
        break;
      case 'toggle-transcript':
        this.toggleTranscriptOverlay();
        break;
    }
  }

  // Platform-specific integrations
  setupZoomIntegration() {
    console.log('Setting up Zoom integration');
    
    // Wait for Zoom interface to load
    this.waitForElement('[aria-label="Mute"]', () => {
      this.injectZoomControls();
    });
  }

  setupGoogleMeetIntegration() {
    console.log('Setting up Google Meet integration');
    
    // Wait for Google Meet interface to load
    this.waitForElement('[data-is-muted]', () => {
      this.injectGoogleMeetControls();
    });
  }

  setupTeamsIntegration() {
    console.log('Setting up Teams integration');
    
    // Wait for Teams interface to load
    this.waitForElement('[data-tid="toggle-mute"]', () => {
      this.injectTeamsControls();
    });
  }

  setupWebexIntegration() {
    console.log('Setting up Webex integration');
    // Webex integration implementation
  }

  injectRecordingControls() {
    if (document.getElementById('meetnote-controls')) return; // Already injected
    
    const controlsHtml = `
      <div id="meetnote-controls" class="meetnote-floating-controls">
        <div class="meetnote-control-button" id="meetnote-record-btn" data-tooltip="Start Recording">
          <span class="meetnote-icon">●</span>
        </div>
        <div class="meetnote-control-button" id="meetnote-highlight-btn" data-tooltip="Create Highlight">
          <span class="meetnote-icon">✨</span>
        </div>
        <div class="meetnote-control-button" id="meetnote-transcript-btn" data-tooltip="Toggle Transcript">
          <span class="meetnote-icon">📝</span>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', controlsHtml);
    
    // Add event listeners
    document.getElementById('meetnote-record-btn')?.addEventListener('click', () => {
      this.toggleRecording();
    });
    
    document.getElementById('meetnote-highlight-btn')?.addEventListener('click', () => {
      this.createHighlight();
    });
    
    document.getElementById('meetnote-transcript-btn')?.addEventListener('click', () => {
      this.toggleTranscriptOverlay();
    });
  }

  injectZoomControls() {
    const toolbar = document.querySelector('.footer__leave-btn-container');
    if (toolbar && !document.getElementById('meetnote-zoom-btn')) {
      const button = this.createPlatformButton('meetnote-zoom-btn', 'MeetNote');
      toolbar.insertBefore(button, toolbar.firstChild);
    }
  }

  injectGoogleMeetControls() {
    const toolbar = document.querySelector('[data-call-controls-container="true"]');
    if (toolbar && !document.getElementById('meetnote-meet-btn')) {
      const button = this.createPlatformButton('meetnote-meet-btn', 'MeetNote');
      toolbar.appendChild(button);
    }
  }

  injectTeamsControls() {
    const toolbar = document.querySelector('[data-tid="taskbar"]');
    if (toolbar && !document.getElementById('meetnote-teams-btn')) {
      const button = this.createPlatformButton('meetnote-teams-btn', 'MeetNote');
      toolbar.appendChild(button);
    }
  }

  createPlatformButton(id, text) {
    const button = document.createElement('button');
    button.id = id;
    button.className = 'meetnote-platform-btn';
    button.innerHTML = `
      <span class="meetnote-btn-icon">🎙️</span>
      <span class="meetnote-btn-text">${text}</span>
    `;
    button.addEventListener('click', () => this.toggleRecording());
    return button;
  }

  toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  async startRecording() {
    console.log('🎬 Content: Starting recording process...');
    
    try {
      this.showLoading('Starting recording...');
      
      // Content scripts can't use chrome.tabs.query, so we get info from current page
      const currentUrl = window.location.href;
      const meetingInfo = this.detectMeetingFromUrl(currentUrl);
      
      console.log('🔍 Content: Meeting detection result:', meetingInfo);
      console.log('🌐 Content: Current URL:', currentUrl);
      
      if (!meetingInfo) {
        console.error('❌ Content: No meeting detected');
        this.showError('No meeting detected - please make sure you are in a meeting room');
        return;
      }

      console.log('📤 Content: Sending START_RECORDING message to background...');
      const recordingData = {
        platform: meetingInfo.platform,
        title: `${meetingInfo.name} Meeting`,
        meetingId: this.extractMeetingId(currentUrl),
        url: currentUrl
      };
      console.log('📋 Content: Recording data:', recordingData);

      const response = await chrome.runtime.sendMessage({
        type: 'START_RECORDING',
        data: recordingData
      });

      console.log('📥 Content: Background response:', response);

      if (response && response.error) {
        console.error('❌ Content: Background returned error:', response.error);
        this.showError(`Recording failed: ${response.error}`);
        return;
      }

      if (response && (response.success || response.data)) {
        console.log('✅ Content: Recording started successfully');
        this.isRecording = true;
        this.recordingStartTime = Date.now();
        this.updateRecordingUI();
        this.startDurationTimer();
        this.showSuccess('Recording started!');
      } else {
        console.error('❌ Content: Unexpected response format:', response);
        this.showError('Recording failed - unexpected response');
      }
    } catch (error) {
      console.error('❌ Content: Failed to start recording:', error);
      console.error('📋 Content: Error details:', {
        message: error.message,
        stack: error.stack,
        url: window.location.href,
        platform: this.platform
      });
      this.showError(`Recording failed: ${error.message}`);
    } finally {
      this.hideLoading();
    }
  }

  stopRecording() {
    chrome.runtime.sendMessage({
      type: 'STOP_RECORDING',
      data: {}
    }).then(response => {
      if (response && !response.error) {
        this.isRecording = false;
        this.updateRecordingUI();
        this.showNotification('Recording stopped', 'success');
      } else {
        this.showNotification('Failed to stop recording', 'error');
      }
    });
  }

  createHighlight() {
    if (!this.isRecording) {
      this.showNotification('Start recording to create highlights', 'warning');
      return;
    }

    chrome.runtime.sendMessage({
      type: 'CREATE_HIGHLIGHT',
      data: {
        timestamp: Date.now(),
        text: 'Highlight created from page'
      }
    }).then(response => {
      if (response && !response.error) {
        this.showNotification('Highlight created', 'success');
      } else {
        this.showNotification('Failed to create highlight', 'error');
      }
    });
  }

  createHighlightFromContext(selectedText) {
    if (!this.isRecording) {
      this.showNotification('Start recording to create highlights', 'warning');
      return;
    }

    chrome.runtime.sendMessage({
      type: 'CREATE_HIGHLIGHT',
      data: {
        timestamp: Date.now(),
        text: selectedText || 'Context highlight'
      }
    }).then(response => {
      if (response && !response.error) {
        this.showNotification('Highlight created from selection', 'success');
      }
    });
  }

  toggleTranscriptOverlay() {
    if (this.transcriptOverlay) {
      this.hideTranscriptOverlay();
    } else {
      this.showTranscriptOverlay();
    }
  }

  showTranscriptOverlay() {
    if (this.transcriptOverlay) return;

    const overlayHtml = `
      <div id="meetnote-transcript-overlay" class="meetnote-transcript-overlay">
        <div class="meetnote-transcript-header">
          <span class="meetnote-transcript-title">Live Transcript</span>
          <button class="meetnote-transcript-close" id="meetnote-transcript-close">×</button>
        </div>
        <div class="meetnote-transcript-content" id="meetnote-transcript-content">
          <div class="meetnote-transcript-message">
            Transcript will appear here when recording starts...
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', overlayHtml);
    this.transcriptOverlay = document.getElementById('meetnote-transcript-overlay');

    // Add close button listener
    document.getElementById('meetnote-transcript-close')?.addEventListener('click', () => {
      this.hideTranscriptOverlay();
    });

    // Simulate transcript updates (in real implementation, this would come from the API)
    if (this.isRecording) {
      this.startTranscriptSimulation();
    }
  }

  hideTranscriptOverlay() {
    if (this.transcriptOverlay) {
      this.transcriptOverlay.remove();
      this.transcriptOverlay = null;
    }
  }

  startTranscriptSimulation() {
    // This is a simulation - in real implementation, transcript would come from WebSocket or API
    const sampleTranscripts = [
      { speaker: 'John', text: 'Let\'s start today\'s meeting.' },
      { speaker: 'Sarah', text: 'Thanks everyone for joining.' },
      { speaker: 'Mike', text: 'I have some updates on the project.' }
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (!this.isRecording || !this.transcriptOverlay || index >= sampleTranscripts.length) {
        clearInterval(interval);
        return;
      }

      this.addTranscriptLine(sampleTranscripts[index]);
      index++;
    }, 3000);
  }

  addTranscriptLine(line) {
    const content = document.getElementById('meetnote-transcript-content');
    if (!content) return;

    // Clear placeholder message
    if (content.querySelector('.meetnote-transcript-message')) {
      content.innerHTML = '';
    }

    const lineHtml = `
      <div class="meetnote-transcript-line">
        <span class="meetnote-transcript-speaker">${line.speaker}:</span>
        <span class="meetnote-transcript-text">${line.text}</span>
      </div>
    `;

    content.insertAdjacentHTML('beforeend', lineHtml);
    content.scrollTop = content.scrollHeight;
  }

  updateTranscriptContent(transcript) {
    const content = document.getElementById('meetnote-transcript-content');
    if (!content) {
      console.log('⚠️ Transcript content element not found, showing overlay first');
      this.showTranscriptOverlay();
      return;
    }

    if (!transcript || transcript.length === 0) {
      content.innerHTML = '<div class="meetnote-transcript-message">Listening for audio...</div>';
      return;
    }

    // Clear existing content
    content.innerHTML = '';

    // Show last 10 segments
    const recentSegments = transcript.slice(-10);
    
    recentSegments.forEach(segment => {
      const lineHtml = `
        <div class="meetnote-transcript-line">
          <span class="meetnote-transcript-speaker">${segment.speaker || 'Speaker'}:</span>
          <span class="meetnote-transcript-text">${segment.text}</span>
        </div>
      `;
      content.insertAdjacentHTML('beforeend', lineHtml);
    });

    // Auto-scroll to bottom
    content.scrollTop = content.scrollHeight;
    console.log('✅ Transcript UI updated with', recentSegments.length, 'segments');
  }

  updateRecordingUI() {
    const recordBtn = document.getElementById('meetnote-record-btn');
    const platformBtns = document.querySelectorAll('.meetnote-platform-btn');

    if (this.isRecording) {
      recordBtn?.classList.add('meetnote-recording');
      recordBtn?.setAttribute('data-tooltip', 'Stop Recording');
      platformBtns.forEach(btn => btn.classList.add('meetnote-recording'));
    } else {
      recordBtn?.classList.remove('meetnote-recording');
      recordBtn?.setAttribute('data-tooltip', 'Start Recording');
      platformBtns.forEach(btn => btn.classList.remove('meetnote-recording'));
    }
  }

  getMeetingTitle() {
    // Platform-specific title extraction
    switch (this.platform) {
      case 'zoom':
        return document.querySelector('.meeting-topic')?.textContent || 'Zoom Meeting';
      case 'google-meet':
        return document.title.replace(' - Google Meet', '') || 'Google Meet';
      case 'teams':
        return document.querySelector('[data-tid="meeting-title"]')?.textContent || 'Teams Meeting';
      default:
        return 'Meeting';
    }
  }

  getParticipants() {
    // Platform-specific participant extraction
    const participants = [];
    
    switch (this.platform) {
      case 'zoom':
        const zoomParticipants = document.querySelectorAll('.participants-item__display-name');
        zoomParticipants.forEach(p => participants.push(p.textContent?.trim()));
        break;
      case 'google-meet':
        // Google Meet participant extraction
        break;
      case 'teams':
        // Teams participant extraction
        break;
    }
    
    return participants.filter(p => p);
  }

  showNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.getElementById('meetnote-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'meetnote-notification';
    notification.className = `meetnote-notification meetnote-notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  startMeetingObserver() {
    // Observe DOM changes to detect meeting state changes
    this.meetingObserver = new MutationObserver((mutations) => {
      // Check for meeting-related changes
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Handle dynamic content changes
          this.handleDynamicChanges(mutation);
        }
      });
    });

    this.meetingObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  handleDynamicChanges(mutation) {
    // Re-inject controls if they were removed
    if (!document.getElementById('meetnote-controls')) {
      setTimeout(() => this.injectRecordingControls(), 1000);
    }
  }

  waitForElement(selector, callback, maxWait = 10000) {
    const startTime = Date.now();
    
    const check = () => {
      const element = document.querySelector(selector);
      if (element) {
        callback(element);
      } else if (Date.now() - startTime < maxWait) {
        setTimeout(check, 500);
      }
    };
    
    check();
  }

  showSuccess(message) {
    console.log('✅ Content: Success -', message);
    this.showNotification(message, 'success');
  }

  showError(message) {
    console.error('❌ Content: Error -', message);
    this.showNotification(message, 'error');
  }

  showLoading(message = 'Loading...') {
    console.log('⏳ Content: Loading -', message);
    // Could add a loading spinner here
  }

  showLoginRequired() {
    console.log('🔐 Content: Login required');
    this.showNotification('Please log in to MeetNote extension first', 'error');
    
    // Open the extension popup to allow login
    setTimeout(() => {
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
    }, 2000);
  }

  hideLoading() {
    console.log('✅ Content: Loading complete');
    // Hide loading spinner
  }

  // Stub methods for features not yet implemented
  requestRealScreenCapture() {
    console.log('⚠️ Screen capture not yet implemented');
    return Promise.reject(new Error('Screen capture not yet implemented'));
  }

  stopAudioCapture() {
    console.log('⚠️ Audio capture stop called');
  }

  updateRealTranscriptOverlay(data) {
    console.log('📝 Transcript overlay update:', data);
  }

  detectMeetingFromUrl(url) {
    const patterns = {
      zoom: { pattern: /zoom\.us/, name: 'Zoom', platform: 'zoom' },
      'google-meet': { pattern: /meet\.google\.com/, name: 'Google Meet', platform: 'google-meet' },
      teams: { pattern: /teams\.microsoft\.com/, name: 'Microsoft Teams', platform: 'teams' },
      webex: { pattern: /webex\.com/, name: 'Webex', platform: 'webex' }
    };

    for (const [key, config] of Object.entries(patterns)) {
      if (config.pattern.test(url)) {
        return {
          platform: config.platform,
          name: config.name,
          url
        };
      }
    }
    return null;
  }

  extractMeetingId(url) {
    console.log('🔍 Extracting meeting ID from URL:', url);
    
    const zoomMatch = url.match(/zoom\.us\/j\/(\d+)/);
    if (zoomMatch) {
      console.log('✅ Found Zoom meeting ID:', zoomMatch[1]);
      return zoomMatch[1];
    }
    
    const meetMatch = url.match(/meet\.google\.com\/([a-z-]+)/);
    if (meetMatch) {
      console.log('✅ Found Google Meet ID:', meetMatch[1]);
      return meetMatch[1];
    }

    // Handle Google Meet URLs with different formats
    const meetMatch2 = url.match(/meet\.google\.com\/([a-z0-9-]+)/i);
    if (meetMatch2) {
      console.log('✅ Found Google Meet ID (alt format):', meetMatch2[1]);
      return meetMatch2[1];
    }
    
    console.log('⚠️ No meeting ID found in URL');
    return null;
  }

  startDurationTimer() {
    console.log('⏱️ Content: Starting duration timer');
    // Implementation for duration timer
  }

  // Cleanup on page unload
  cleanup() {
    if (this.meetingObserver) {
      this.meetingObserver.disconnect();
    }
    
    // Remove injected elements
    document.getElementById('meetnote-controls')?.remove();
    document.getElementById('meetnote-transcript-overlay')?.remove();
  }
}

// Initialize content script
const meetNoteContent = new MeetNoteContent();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  meetNoteContent.cleanup();
});

} // End of meetNoteContentInitialized check