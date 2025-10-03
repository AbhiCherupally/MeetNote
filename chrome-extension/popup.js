// State
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let transcript = [];
let recordingStartTime = null;
let recordingInterval = null;

// API Configuration
const API_URL = 'https://meetnote-backend.onrender.com/api';

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  await checkBackendStatus();
  await checkCurrentTab();
  await checkRecordingStatus(); // Check if already recording
  setupEventListeners();
  updateUI();
}

function setupEventListeners() {
  document.getElementById('recordBtn').addEventListener('click', toggleRecording);
  document.getElementById('viewMeetingsBtn').addEventListener('click', viewMeetings);
  document.getElementById('highlightBtn').addEventListener('click', createHighlight);
  document.getElementById('transcriptBtn').addEventListener('click', showTranscript);
}

async function checkBackendStatus() {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  
  try {
    const response = await fetch(`${API_URL.replace('/api', '')}/health`);
    if (response.ok) {
      statusDot.className = 'status-dot online';
      statusText.textContent = 'Connected';
    } else {
      throw new Error('Backend not responding');
    }
  } catch (error) {
    statusDot.className = 'status-dot offline';
    statusText.textContent = 'Backend Offline';
    console.error('Backend connection failed:', error);
  }
}

async function checkRecordingStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATUS' });
    if (response && response.isRecording) {
      isRecording = true;
      recordingStartTime = Date.now() - response.duration;
      startRecordingTimer();
      console.log('✅ Restored recording state:', response);
    }
  } catch (error) {
    console.error('❌ Failed to check recording status:', error);
  }
}

async function checkRecordingStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATUS' });
    if (response && response.isRecording) {
      isRecording = true;
      recordingStartTime = Date.now() - response.duration;
      startRecordingTimer();
      console.log('✅ Restored recording state');
    }
  } catch (error) {
    console.error('❌ Failed to check recording status:', error);
  }
}

async function checkCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab.url;
    
    console.log('🔍 Checking current tab:', url);
    
    const meetingInfo = detectMeetingFromUrl(url);
    
    if (meetingInfo) {
      console.log('✅ Meeting detected:', meetingInfo);
      showMeetingDetected(meetingInfo);
    } else {
      console.log('⚠️ No meeting detected');
      showNoMeeting();
    }
  } catch (error) {
    console.error('❌ Failed to check current tab:', error);
    showNoMeeting();
  }
}

function detectMeetingFromUrl(url) {
  if (!url) return null;
  
  const patterns = {
    'google-meet': {
      pattern: /meet\.google\.com\/[a-z0-9-]+/i,
      name: 'Google Meet',
      icon: '📹'
    },
    'zoom': {
      pattern: /zoom\.us\/j\/\d+/,
      name: 'Zoom',
      icon: '🎥'
    },
    'teams': {
      pattern: /teams\.microsoft\.com/,
      name: 'Microsoft Teams',
      icon: '💼'
    },
    'webex': {
      pattern: /webex\.com/,
      name: 'Webex',
      icon: '🎦'
    }
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

function showMeetingDetected(meetingInfo) {
  const noMeeting = document.getElementById('noMeeting');
  const meetingSection = document.getElementById('meetingInfo');
  
  noMeeting.style.display = 'none';
  meetingSection.style.display = 'block';
  
  document.getElementById('platformName').textContent = meetingInfo.name;
  document.getElementById('meetingTitle').textContent = 'Meeting in progress';
  
  // Enable recording button
  document.getElementById('recordBtn').disabled = false;
  
  console.log('✅ Meeting UI updated:', meetingInfo.name);
}

function showNoMeeting() {
  const noMeeting = document.getElementById('noMeeting');
  const meetingSection = document.getElementById('meetingInfo');
  
  noMeeting.style.display = 'block';
  meetingSection.style.display = 'none';
  
  console.log('ℹ️ No meeting UI shown');
}

async function toggleRecording() {
  if (isRecording) {
    await stopRecording();
  } else {
    await startRecording();
  }
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Popup received message:', message.type);
  
  if (message.type === 'RECORDING_STARTED') {
    isRecording = true;
    recordingStartTime = Date.now();
    startRecordingTimer();
    updateUI();
    console.log('✅ Recording started notification received');
  }
  
  if (message.type === 'RECORDING_STOPPED') {
    isRecording = false;
    stopRecordingTimer();
    updateUI();
    console.log('✅ Recording stopped notification received');
  }
  
  if (message.type === 'TRANSCRIPT_UPDATED') {
    transcript = message.transcript;
    console.log('📝 Transcript updated:', transcript.length, 'segments');
  }
  
  if (message.type === 'MEETING_SAVED') {
    alert('✅ Meeting saved with AI summary!');
    transcript = [];
    audioChunks = [];
  }
});

async function startRecording() {
  try {
    console.log('🎤 Popup: Sending START_RECORDING message to background...');
    
    chrome.runtime.sendMessage({ type: 'START_RECORDING' }, (response) => {
      console.log('📥 Popup: Response from background:', response);
      
      if (response && response.success) {
        console.log('✅ Popup: Recording started successfully');
        // UI will be updated by background message listener
      } else {
        const errorMessage = response ? response.message : 'Unknown error';
        console.error('❌ Popup: Recording failed:', errorMessage);
        
        let displayMessage = 'Failed to start recording.\n\n';
        
        if (errorMessage.includes('NotAllowedError') || errorMessage.includes('denied')) {
          displayMessage += '🎤 Microphone permission denied.\n\n';
          displayMessage += 'To fix:\n';
          displayMessage += '1. Go to chrome://extensions/\n';
          displayMessage += '2. Find MeetNote extension\n';
          displayMessage += '3. Click "Details"\n';
          displayMessage += '4. Scroll to "Site access"\n';
          displayMessage += '5. Allow microphone permission\n';
          displayMessage += '6. Reload this page';
        } else if (errorMessage.includes('NotFoundError')) {
          displayMessage += '🎤 No microphone found.\n\n';
          displayMessage += 'Please connect a microphone and try again.';
        } else {
          displayMessage += 'Error: ' + errorMessage;
        }
        
        alert(displayMessage);
      }
    });
    
  } catch (error) {
    console.error('❌ Popup: Failed to send START_RECORDING:', error);
    alert('Failed to communicate with background service: ' + error.message);
  }
}

async function stopRecording() {
  try {
    console.log('⏹️ Popup: Sending STOP_RECORDING message to background...');
    
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }, (response) => {
      console.log('📥 Popup: Stop response from background:', response);
      
      if (response && response.success) {
        console.log('✅ Popup: Recording stopped successfully');
        // UI will be updated by background message listener
      } else {
        console.error('❌ Popup: Failed to stop recording:', response?.message);
        alert('Failed to stop recording: ' + (response?.message || 'Unknown error'));
      }
    });
    
  } catch (error) {
    console.error('❌ Popup: Failed to send STOP_RECORDING:', error);
    alert('Failed to communicate with background service: ' + error.message);
  }
}

// All recording logic now in background.js - these functions removed

function createHighlight() {
  if (isRecording) {
    const timestamp = formatDuration(Date.now() - recordingStartTime);
    alert(`✨ Highlight created at ${timestamp}`);
  }
}

function showTranscript() {
  if (transcript.length === 0) {
    alert('No transcript available. Start recording first.');
    return;
  }
  
  const transcriptText = transcript.map(seg => 
    `[${seg.timestamp}] ${seg.speaker}: ${seg.text}`
  ).join('\n\n');
  
  alert('Transcript:\n\n' + transcriptText);
}

async function viewMeetings() {
  try {
    const response = await fetch(`${API_URL}/meetings/`);
    const data = await response.json();
    
    if (data.success && data.meetings.length > 0) {
      const meetingsList = data.meetings.map(m => 
        `• ${m.title} (${new Date(m.date).toLocaleDateString()})`
      ).join('\n');
      alert('Your Meetings:\n\n' + meetingsList);
    } else {
      alert('No meetings found. Record your first meeting!');
    }
  } catch (error) {
    console.error('Failed to fetch meetings:', error);
    alert('Failed to load meetings');
  }
}

function startRecordingTimer() {
  recordingInterval = setInterval(() => {
    const duration = Date.now() - recordingStartTime;
    document.getElementById('recordingDuration').textContent = formatDuration(duration);
  }, 1000);
}

function stopRecordingTimer() {
  if (recordingInterval) {
    clearInterval(recordingInterval);
    recordingInterval = null;
  }
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function showLoading(text) {
  document.getElementById('loadingText').textContent = text;
  document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

function showNotification(message) {
  console.log('📢', message);
  // Could add visual notification here
}

function updateUI() {
  const recordBtn = document.getElementById('recordBtn');
  const recordingInfo = document.getElementById('recordingInfo');
  
  if (isRecording) {
    recordBtn.innerHTML = '<span class="record-icon">■</span><span class="record-text">Stop Recording</span>';
    recordBtn.classList.add('recording');
    recordingInfo.style.display = 'block';
    document.getElementById('highlightBtn').disabled = false;
    document.getElementById('transcriptBtn').disabled = false;
  } else {
    recordBtn.innerHTML = '<span class="record-icon">●</span><span class="record-text">Start Recording</span>';
    recordBtn.classList.remove('recording');
    recordingInfo.style.display = 'none';
    document.getElementById('recordingDuration').textContent = '00:00';
  }
}
