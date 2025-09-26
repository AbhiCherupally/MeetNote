// Popup JavaScript for MeetNote Extension
class MeetNotePopup {
  constructor() {
    this.isRecording = false;
    this.currentMeeting = null;
    this.recordingStartTime = null;
    this.durationTimer = null;
    this.init();
  }

  async init() {
    console.log('MeetNote popup initializing...');
    
    // Wait for DOM to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
    } else {
      this.setupEventListeners();
    }

    try {
      // Check authentication status
      await this.checkAuthStatus();
      
      // Check for current meeting
      await this.checkMeetingStatus();
      
      // Load user settings
      await this.loadSettings();
      
      console.log('MeetNote popup initialization complete');
    } catch (error) {
      console.error('Failed to initialize popup:', error);
      this.showError('Failed to initialize extension');
    }
  }

  setupEventListeners() {
    // Authentication
    const loginForm = document.getElementById('loginForm');
    const googleSignIn = document.getElementById('googleSignIn');
    const signUpLink = document.getElementById('signUpLink');
    const passwordToggle = document.getElementById('passwordToggle');

    if (loginForm) {
      loginForm.addEventListener('submit', this.handleLogin.bind(this));
    }
    
    if (googleSignIn) {
      googleSignIn.addEventListener('click', this.handleGoogleSignIn.bind(this));
    }
    
    if (passwordToggle) {
      passwordToggle.addEventListener('click', this.togglePasswordVisibility.bind(this));
    }

    // Recording controls
    const recordBtn = document.getElementById('recordBtn');
    const highlightBtn = document.getElementById('highlightBtn');
    const transcriptBtn = document.getElementById('transcriptBtn');
    const settingsBtn = document.getElementById('settingsBtn');

    if (recordBtn) {
      recordBtn.addEventListener('click', this.toggleRecording.bind(this));
    }
    
    if (highlightBtn) {
      highlightBtn.addEventListener('click', this.createHighlight.bind(this));
    }
    
    if (transcriptBtn) {
      transcriptBtn.addEventListener('click', this.toggleTranscript.bind(this));
    }
    
    if (settingsBtn) {
      settingsBtn.addEventListener('click', this.openSettings.bind(this));
    }

    // Quick actions
    const viewMeetingsBtn = document.getElementById('viewMeetingsBtn');
    const shareBtn = document.getElementById('shareBtn');

    if (viewMeetingsBtn) {
      viewMeetingsBtn.addEventListener('click', this.viewMeetings.bind(this));
    }
    
    if (shareBtn) {
      shareBtn.addEventListener('click', this.shareRecording.bind(this));
    }

    // Footer links
    const helpLink = document.getElementById('helpLink');
    const feedbackLink = document.getElementById('feedbackLink');

    if (helpLink) {
      helpLink.addEventListener('click', () => this.openUrl('https://help.meetnote.app'));
    }
    
    if (feedbackLink) {
      feedbackLink.addEventListener('click', () => this.openUrl('https://feedback.meetnote.app'));
    }

    console.log('Event listeners setup complete');
  }

  async checkAuthStatus() {
    try {
      this.showLoading('Checking authentication...');
      
      const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' });
      
      if (chrome.runtime.lastError) {
        console.error('Chrome runtime error:', chrome.runtime.lastError);
        throw new Error(chrome.runtime.lastError.message);
      }
      
      if (response && response.authenticated) {
        this.showMainContent(response.user);
      } else {
        this.showAuthSection();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      this.showAuthSection();
      this.showError(`Authentication check failed: ${error.message}`);
    } finally {
      this.hideLoading();
    }
  }

  async checkMeetingStatus() {
    try {
      // Get current active tab
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!activeTab) return;

      // Check if current tab is a meeting platform
      const meetingInfo = this.detectMeetingFromUrl(activeTab.url);
      
      if (meetingInfo) {
        this.updateMeetingInfo(meetingInfo);
        this.enableRecordingControls();
      } else {
        this.showNoMeeting();
        this.disableRecordingControls();
      }
    } catch (error) {
      console.error('Failed to check meeting status:', error);
    }
  }

  detectMeetingFromUrl(url) {
    const patterns = {
      zoom: { pattern: /zoom\.us/, name: 'Zoom', icon: 'icons/zoom.png' },
      'google-meet': { pattern: /meet\.google\.com/, name: 'Google Meet', icon: 'icons/meet.png' },
      teams: { pattern: /teams\.microsoft\.com/, name: 'Microsoft Teams', icon: 'icons/teams.png' },
      webex: { pattern: /webex\.com/, name: 'Webex', icon: 'icons/webex.png' }
    };

    for (const [platform, config] of Object.entries(patterns)) {
      if (config.pattern.test(url)) {
        return {
          platform,
          name: config.name,
          icon: config.icon,
          url
        };
      }
    }

    return null;
  }

  togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.querySelector('.password-toggle-icon');
    
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      toggleIcon.textContent = '🙈'; // Hide password icon
    } else {
      passwordInput.type = 'password';
      toggleIcon.textContent = '👁️'; // Show password icon
    }
  }

  async handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    console.log('🔐 Login attempt with:', { email, passwordLength: password.length });
    
    if (!email || !password) {
      this.showError('Please fill in all fields');
      return;
    }

    try {
      this.showLoading('Signing in...');
      
      console.log('📤 Sending authentication request to background...');
      const response = await chrome.runtime.sendMessage({
        type: 'AUTHENTICATE',
        data: { email, password }
      });

      console.log('📥 Authentication response:', response);

      if (response && response.success && response.data && response.data.user) {
        console.log('✅ Login successful:', response.data.user);
        this.showMainContent(response.data.user);
      } else if (response && response.error) {
        console.error('❌ Authentication error:', response.error);
        this.showError(`Login failed: ${response.error}`);
      } else {
        console.error('❌ Unexpected response format:', response);
        this.showError('Invalid credentials - please check your email and password');
      }
    } catch (error) {
      console.error('❌ Login exception:', error);
      this.showError('Login failed. Please try again.');
    } finally {
      this.hideLoading();
    }
  }

  async handleGoogleSignIn() {
    try {
      this.showLoading('Signing in with Google...');
      
      // TODO: Implement Google OAuth flow
      this.showError('Google sign-in coming soon!');
    } catch (error) {
      console.error('Google sign-in failed:', error);
      this.showError('Google sign-in failed');
    } finally {
      this.hideLoading();
    }
  }

  async toggleRecording() {
    if (this.isRecording) {
      await this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  async startRecording() {
    try {
      this.showLoading('Starting recording...');
      
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const meetingInfo = this.detectMeetingFromUrl(activeTab.url);
      
      if (!meetingInfo) {
        this.showError('No meeting detected');
        return;
      }

      const response = await chrome.runtime.sendMessage({
        type: 'START_RECORDING',
        data: {
          platform: meetingInfo.platform,
          title: `${meetingInfo.name} Meeting`,
          meetingId: this.extractMeetingId(activeTab.url)
        }
      });

      if (response && !response.error) {
        this.isRecording = true;
        this.recordingStartTime = Date.now();
        this.updateRecordingUI();
        this.startDurationTimer();
        this.showSuccess('Recording started!');
      } else {
        this.showError(response?.error || 'Failed to start recording');
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.showError('Failed to start recording');
    } finally {
      this.hideLoading();
    }
  }

  async stopRecording() {
    try {
      this.showLoading('Stopping recording...');
      
      const duration = this.recordingStartTime ? 
        Math.floor((Date.now() - this.recordingStartTime) / 1000) : 0;

      const response = await chrome.runtime.sendMessage({
        type: 'STOP_RECORDING',
        data: { duration }
      });

      if (response && !response.error) {
        this.isRecording = false;
        this.recordingStartTime = null;
        this.updateRecordingUI();
        this.stopDurationTimer();
        this.showSuccess('Recording stopped and processing...');
      } else {
        this.showError(response?.error || 'Failed to stop recording');
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.showError('Failed to stop recording');
    } finally {
      this.hideLoading();
    }
  }

  async createHighlight() {
    try {
      if (!this.isRecording) {
        this.showError('No active recording');
        return;
      }

      const currentTime = this.recordingStartTime ? 
        Math.floor((Date.now() - this.recordingStartTime) / 1000) : 0;

      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_HIGHLIGHT',
        data: {
          timestamp: currentTime,
          text: 'Manual highlight created'
        }
      });

      if (response && !response.error) {
        this.updateHighlightCount();
        this.showSuccess('Highlight created!');
      } else {
        this.showError(response?.error || 'Failed to create highlight');
      }
    } catch (error) {
      console.error('Failed to create highlight:', error);
      this.showError('Failed to create highlight');
    }
  }

  toggleTranscript() {
    // Send message to content script to toggle transcript overlay
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_TRANSCRIPT' });
      }
    });
  }

  openSettings() {
    chrome.runtime.openOptionsPage();
  }

  viewMeetings() {
    this.openUrl('https://app.meetnote.com/meetings');
  }

  shareRecording() {
    if (!this.isRecording) {
      this.showError('No active recording to share');
      return;
    }
    
    // TODO: Implement sharing functionality
    this.showError('Sharing coming soon!');
  }

  // UI Helper Methods
  showAuthSection() {
    this.hideElement('mainContent');
    this.showElement('authSection');
  }

  showMainContent(user) {
    this.hideElement('authSection');
    this.showElement('mainContent');
    
    // Update user info if needed
    if (user) {
      this.updateUsageInfo(user.usage);
    }
  }

  updateMeetingInfo(meetingInfo) {
    const meetingSection = document.getElementById('meetingInfo');
    const noMeeting = document.getElementById('noMeeting');
    const platformIcon = document.getElementById('platformIcon');
    const platformName = document.getElementById('platformName');
    const meetingTitle = document.getElementById('meetingTitle');

    if (meetingSection && noMeeting) {
      this.showElement('meetingInfo');
      this.hideElement('noMeeting');
      
      if (platformIcon) platformIcon.src = meetingInfo.icon;
      if (platformName) platformName.textContent = meetingInfo.name;
      if (meetingTitle) meetingTitle.textContent = 'Meeting Room';
    }
  }

  showNoMeeting() {
    const meetingSection = document.getElementById('meetingInfo');
    const noMeeting = document.getElementById('noMeeting');

    if (meetingSection && noMeeting) {
      this.hideElement('meetingInfo');
      this.showElement('noMeeting');
    }
  }

  enableRecordingControls() {
    const recordBtn = document.getElementById('recordBtn');
    const highlightBtn = document.getElementById('highlightBtn');
    const transcriptBtn = document.getElementById('transcriptBtn');

    if (recordBtn) recordBtn.disabled = false;
    if (highlightBtn) highlightBtn.disabled = false;
    if (transcriptBtn) transcriptBtn.disabled = false;
  }

  disableRecordingControls() {
    const recordBtn = document.getElementById('recordBtn');
    const highlightBtn = document.getElementById('highlightBtn');
    const transcriptBtn = document.getElementById('transcriptBtn');

    if (recordBtn) recordBtn.disabled = true;
    if (highlightBtn) highlightBtn.disabled = true;
    if (transcriptBtn) transcriptBtn.disabled = true;
  }

  updateRecordingUI() {
    const recordBtn = document.getElementById('recordBtn');
    const recordText = document.querySelector('.record-text');
    const recordingInfo = document.getElementById('recordingInfo');

    if (this.isRecording) {
      if (recordBtn) recordBtn.classList.add('recording');
      if (recordText) recordText.textContent = 'Stop Recording';
      this.showElement('recordingInfo');
    } else {
      if (recordBtn) recordBtn.classList.remove('recording');
      if (recordText) recordText.textContent = 'Start Recording';
      this.hideElement('recordingInfo');
    }
  }

  startDurationTimer() {
    this.durationTimer = setInterval(() => {
      if (this.recordingStartTime) {
        const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
        this.updateDurationDisplay(elapsed);
      }
    }, 1000);
  }

  stopDurationTimer() {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
  }

  updateDurationDisplay(seconds) {
    const durationEl = document.getElementById('recordingDuration');
    if (durationEl) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      durationEl.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }

  updateHighlightCount() {
    const highlightCount = document.getElementById('highlightCount');
    if (highlightCount) {
      const current = parseInt(highlightCount.textContent) || 0;
      highlightCount.textContent = (current + 1).toString();
    }
  }

  updateUsageInfo(usage) {
    const monthlyUsage = document.getElementById('monthlyUsage');
    if (monthlyUsage && usage) {
      monthlyUsage.textContent = `${usage.transcriptionMinutes || 0}/100`;
    }
  }

  // Utility Methods
  showElement(id) {
    const element = document.getElementById(id);
    if (element) element.style.display = 'block';
  }

  hideElement(id) {
    const element = document.getElementById(id);
    if (element) element.style.display = 'none';
  }

  showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    const text = document.getElementById('loadingText');
    
    if (overlay) overlay.style.display = 'flex';
    if (text) text.textContent = message;
  }

  hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  showSuccess(message) {
    // TODO: Implement toast notifications
    console.log('Success:', message);
  }

  showError(message) {
    // TODO: Implement error notifications
    console.error('Error:', message);
    alert(message); // Temporary error display
  }

  extractMeetingId(url) {
    const zoomMatch = url.match(/zoom\.us\/j\/(\d+)/);
    if (zoomMatch) return zoomMatch[1];
    
    const meetMatch = url.match(/meet\.google\.com\/([a-z-]+)/);
    if (meetMatch) return meetMatch[1];
    
    return null;
  }

  openUrl(url) {
    chrome.tabs.create({ url });
  }

  async loadSettings() {
    try {
      const settings = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (settings) {
        // Apply settings to UI if needed
        console.log('Settings loaded:', settings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new MeetNotePopup();
});