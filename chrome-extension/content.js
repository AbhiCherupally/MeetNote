// Content script for MeetNote extension - injected into meeting platforms
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
    
    console.log('Platform detected:', this.platform);
  }

  handleMessage(message, sender, sendResponse) {
    console.log('Content script received message:', message);
    
    switch (message.type) {
      case 'MEETING_DETECTED':
        this.onMeetingDetected(message);
        break;
        
      case 'KEYBOARD_COMMAND':
        this.handleKeyboardCommand(message.command);
        break;
        
      case 'START_RECORDING_CONTEXT':
        this.startRecordingFromContext();
        break;
        
      case 'CREATE_HIGHLIGHT_CONTEXT':
        this.createHighlightFromContext(message.selectedText);
        break;
        
      case 'TOGGLE_TRANSCRIPT':
        this.toggleTranscriptOverlay();
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  onMeetingDetected(message) {
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
        <div class="meetnote-control-button" id="meetnote-record-btn">
          <span class="meetnote-icon">●</span>
          <span class="meetnote-text">Record</span>
        </div>
        <div class="meetnote-control-button" id="meetnote-highlight-btn">
          <span class="meetnote-icon">✨</span>
        </div>
        <div class="meetnote-control-button" id="meetnote-transcript-btn">
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

  startRecording() {
    // Send message to background script to start recording
    chrome.runtime.sendMessage({
      type: 'START_RECORDING',
      data: {
        platform: this.platform,
        title: this.getMeetingTitle(),
        participants: this.getParticipants()
      }
    }).then(response => {
      if (response && !response.error) {
        this.isRecording = true;
        this.updateRecordingUI();
        this.showNotification('Recording started', 'success');
      } else {
        this.showNotification('Failed to start recording', 'error');
      }
    });
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

  updateRecordingUI() {
    const recordBtn = document.getElementById('meetnote-record-btn');
    const platformBtns = document.querySelectorAll('.meetnote-platform-btn');

    if (this.isRecording) {
      recordBtn?.classList.add('meetnote-recording');
      platformBtns.forEach(btn => btn.classList.add('meetnote-recording'));
      
      const recordText = recordBtn?.querySelector('.meetnote-text');
      if (recordText) recordText.textContent = 'Stop';
    } else {
      recordBtn?.classList.remove('meetnote-recording');
      platformBtns.forEach(btn => btn.classList.remove('meetnote-recording'));
      
      const recordText = recordBtn?.querySelector('.meetnote-text');
      if (recordText) recordText.textContent = 'Record';
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