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

async function startRecording() {
  try {
    console.log('🎤 Requesting microphone access...');
    
    // Check if microphone permission is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Microphone access not supported in this browser');
    }
    
    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    
    console.log('✅ Microphone access granted');
    
    // Check MediaRecorder support
    if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      console.warn('⚠️ Opus codec not supported, using default');
    }
    
    mediaRecorder = new MediaRecorder(stream, { 
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm'
    });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        console.log('📦 Audio chunk received:', event.data.size, 'bytes');
        audioChunks.push(event.data);
        // Process chunk after 10 seconds for transcription
        if (audioChunks.length >= 2) {
          processAudioChunk(audioChunks.slice());
          audioChunks = [];
        }
      }
    };
    
    mediaRecorder.onstop = async () => {
      console.log('⏹️ Recording stopped');
      stream.getTracks().forEach(track => track.stop());
      
      // Process any remaining audio
      if (audioChunks.length > 0) {
        await processAudioChunk(audioChunks.slice());
      }
      
      if (transcript.length > 0) {
        await saveMeeting();
      } else {
        alert('No transcript captured. Recording was too short.');
      }
    };
    
    mediaRecorder.onerror = (event) => {
      console.error('❌ MediaRecorder error:', event.error);
      alert('Recording error: ' + event.error.name);
    };
    
    mediaRecorder.start(5000); // Capture every 5 seconds
    isRecording = true;
    recordingStartTime = Date.now();
    startRecordingTimer();
    updateUI();
    console.log('✅ Recording started successfully');
    
  } catch (error) {
    console.error('❌ Failed to start recording:', error);
    
    let errorMessage = 'Failed to start recording.\n\n';
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMessage += '🎤 Microphone access was denied.\n\n';
      errorMessage += 'To fix this:\n';
      errorMessage += '1. Click the 🔒 lock icon in the address bar\n';
      errorMessage += '2. Find "Microphone" permission\n';
      errorMessage += '3. Change it to "Allow"\n';
      errorMessage += '4. Reload this page and try again';
    } else if (error.name === 'NotFoundError') {
      errorMessage += '🎤 No microphone found.\n\n';
      errorMessage += 'Please connect a microphone and try again.';
    } else if (error.name === 'NotReadableError') {
      errorMessage += '🎤 Microphone is already in use.\n\n';
      errorMessage += 'Close other apps using the microphone and try again.';
    } else {
      errorMessage += 'Error: ' + error.message;
    }
    
    alert(errorMessage);
  }
}

async function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;
    stopRecordingTimer();
    updateUI();
  }
}

async function processAudioChunk(chunks) {
  try {
    console.log('🎵 Processing audio chunks:', chunks.length);
    const audioBlob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
    console.log('📦 Created audio blob:', audioBlob.size, 'bytes');
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Audio = reader.result.split(',')[1];
      console.log('📤 Sending audio to backend for transcription...');
      await transcribeAudio(base64Audio);
    };
    reader.readAsDataURL(audioBlob);
  } catch (error) {
    console.error('❌ Failed to process audio chunk:', error);
  }
}

async function transcribeAudio(audioData) {
  try {
    console.log('🔄 Requesting transcription from background script...');
    const response = await chrome.runtime.sendMessage({
      type: 'TRANSCRIBE_AUDIO',
      audioData: audioData
    });
    
    console.log('📥 Transcription response:', response);
    
    if (response && response.success && response.data) {
      if (response.data.transcript) {
        // Handle array of transcript segments
        transcript.push(...response.data.transcript);
        console.log('✅ Added transcript segments:', response.data.transcript.length);
      } else if (response.data.text) {
        // Handle single text response
        transcript.push({
          text: response.data.text,
          timestamp: new Date().toISOString(),
          speaker: 'Speaker'
        });
        console.log('✅ Added transcript text:', response.data.text.substring(0, 50));
      }
      
      // Show notification
      if (transcript.length > 0) {
        showNotification('Transcription added (' + transcript.length + ' segments)');
      }
    } else if (response && response.error) {
      console.error('❌ Transcription error from backend:', response.error);
    }
  } catch (error) {
    console.error('❌ Transcription error:', error);
  }
}

async function saveMeeting() {
  try {
    const title = prompt('Enter meeting title:', 'Meeting ' + new Date().toLocaleString());
    if (!title) return;
    
    showLoading('Saving meeting...');
    
    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_MEETING',
      data: { title, transcript }
    });
    
    hideLoading();
    
    if (response && response.success) {
      alert('✅ Meeting saved with AI summary!');
      transcript = [];
      audioChunks = [];
    }
  } catch (error) {
    hideLoading();
    console.error('Save error:', error);
    alert('Failed to save meeting: ' + error.message);
  }
}

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
