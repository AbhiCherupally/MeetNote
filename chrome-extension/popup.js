// State
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let transcript = [];
let recordingStartTime = null;
let recordingInterval = null;

// API Configuration
const API_URL = 'http://localhost:8000/api';

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  checkBackendStatus();
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
      document.getElementById('recordBtn').disabled = false;
    } else {
      throw new Error('Backend not responding');
    }
  } catch (error) {
    statusDot.className = 'status-dot offline';
    statusText.textContent = 'Backend Offline';
    console.error('Backend connection failed:', error);
  }
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
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
        processAudioChunk(event.data);
      }
    };
    
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(track => track.stop());
      if (transcript.length > 0) {
        await saveMeeting();
      }
    };
    
    mediaRecorder.start(5000); // Capture every 5 seconds
    isRecording = true;
    recordingStartTime = Date.now();
    startRecordingTimer();
    updateUI();
  } catch (error) {
    console.error('Failed to start recording:', error);
    alert('Failed to start recording. Please allow microphone access.');
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

async function processAudioChunk(audioBlob) {
  try {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Audio = reader.result.split(',')[1];
      await transcribeAudio(base64Audio);
    };
    reader.readAsDataURL(audioBlob);
  } catch (error) {
    console.error('Failed to process audio chunk:', error);
  }
}

async function transcribeAudio(audioData) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'TRANSCRIBE_AUDIO',
      audioData: audioData
    });
    
    if (response && response.success && response.data.transcript) {
      transcript.push(...response.data.transcript);
    }
  } catch (error) {
    console.error('Transcription error:', error);
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
