/**
 * Background Service Worker
 * Manages extension state, API communication, and audio processing
 */

// Constants
const API_BASE_URL = 'https://meetnote-backend.onrender.com';  // Production
// For local development, change to: 'http://127.0.0.1:8000'
const CHUNK_DURATION = 5000; // 5 seconds

// State
let recordingState = {
  isRecording: false,
  meetingId: null,
  audioChunks: [],
  mediaRecorder: null,
  currentTab: null
};

// Installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('MeetNote extension installed');
  
  // Set default settings
  chrome.storage.sync.set({
    apiUrl: API_BASE_URL,
    autoDetect: true,
    showTranscript: true,
    whisperModel: 'base'
  });
});

// Listen for commands (keyboard shortcuts)
chrome.commands.onCommand.addListener((command) => {
  console.log('Command received:', command);
  
  switch (command) {
    case 'start-recording':
      toggleRecording();
      break;
    case 'create-highlight':
      createHighlight();
      break;
    case 'toggle-transcript':
      toggleTranscript();
      break;
  }
});

// Message handler from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  switch (message.type) {
    case 'START_RECORDING':
      startRecording(sender.tab.id);
      sendResponse({ success: true });
      break;
      
    case 'STOP_RECORDING':
      stopRecording();
      sendResponse({ success: true });
      break;
      
    case 'GET_RECORDING_STATE':
      sendResponse({ state: recordingState });
      break;
      
    case 'CREATE_HIGHLIGHT':
      handleCreateHighlight(message.data);
      sendResponse({ success: true });
      break;
      
    case 'MEETING_DETECTED':
      handleMeetingDetected(message.data, sender.tab.id);
      break;
      
    case 'AUDIO_CHUNK':
      handleAudioChunk(message.data);
      break;
  }
  
  return true; // Keep message channel open for async response
});

// Start recording
async function startRecording(tabId) {
  try {
    console.log('Starting recording for tab:', tabId);
    
    recordingState.isRecording = true;
    recordingState.currentTab = tabId;
    recordingState.audioChunks = [];
    
    // Get auth token
    const { token } = await chrome.storage.local.get('token');
    
    if (!token) {
      throw new Error('Not authenticated');
    }
    
    // Create meeting via API
    const response = await fetch(`${API_BASE_URL}/api/meetings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Meeting Recording',
        platform: 'detected',
        meeting_url: await getCurrentTabUrl()
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create meeting');
    }
    
    const meeting = await response.json();
    recordingState.meetingId = meeting.id;
    
    // Start capturing audio from tab
    await startTabAudioCapture(tabId);
    
    // Notify content script
    chrome.tabs.sendMessage(tabId, {
      type: 'RECORDING_STARTED',
      meetingId: meeting.id
    });
    
    // Update badge
    chrome.action.setBadgeText({ text: 'REC' });
    chrome.action.setBadgeBackgroundColor({ color: '#ff0000' });
    
    console.log('Recording started, meeting ID:', meeting.id);
    
  } catch (error) {
    console.error('Failed to start recording:', error);
    recordingState.isRecording = false;
    
    // Show error notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Recording Failed',
      message: error.message
    });
  }
}

// Stop recording
async function stopRecording() {
  if (!recordingState.isRecording) return;
  
  try {
    console.log('Stopping recording');
    
    recordingState.isRecording = false;
    
    // Stop media recorder
    if (recordingState.mediaRecorder) {
      recordingState.mediaRecorder.stop();
    }
    
    // Upload audio to backend
    if (recordingState.audioChunks.length > 0 && recordingState.meetingId) {
      await uploadAudioToBackend();
    }
    
    // Notify content script
    if (recordingState.currentTab) {
      chrome.tabs.sendMessage(recordingState.currentTab, {
        type: 'RECORDING_STOPPED'
      });
    }
    
    // Clear badge
    chrome.action.setBadgeText({ text: '' });
    
    // Show completion notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Recording Complete',
      message: 'Your meeting has been processed and is ready to view.'
    });
    
    // Reset state
    recordingState = {
      isRecording: false,
      meetingId: null,
      audioChunks: [],
      mediaRecorder: null,
      currentTab: null
    };
    
  } catch (error) {
    console.error('Failed to stop recording:', error);
  }
}

// Toggle recording
function toggleRecording() {
  if (recordingState.isRecording) {
    stopRecording();
  } else {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        startRecording(tabs[0].id);
      }
    });
  }
}

// Capture audio from tab
async function startTabAudioCapture(tabId) {
  try {
    // Use chrome.tabCapture to capture audio
    const stream = await chrome.tabCapture.capture({
      audio: true,
      video: false
    });
    
    if (!stream) {
      throw new Error('Failed to capture tab audio');
    }
    
    // Create MediaRecorder
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordingState.audioChunks.push(event.data);
        
        // Send chunk to backend for real-time transcription
        sendAudioChunkToBackend(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      console.log('MediaRecorder stopped');
      stream.getTracks().forEach(track => track.stop());
    };
    
    // Start recording in chunks
    mediaRecorder.start(CHUNK_DURATION);
    recordingState.mediaRecorder = mediaRecorder;
    
    console.log('Tab audio capture started');
    
  } catch (error) {
    console.error('Tab audio capture error:', error);
    throw error;
  }
}

// Send audio chunk to backend for real-time transcription
async function sendAudioChunkToBackend(audioBlob) {
  try {
    const { token } = await chrome.storage.local.get('token');
    
    if (!token || !recordingState.meetingId) return;
    
    // Convert blob to base64
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    
    reader.onloadend = async () => {
      const base64Audio = reader.result.split(',')[1];
      
      // Send to backend via WebSocket or HTTP
      // For now, we'll accumulate and send in bulk
      // Real-time WebSocket can be added later
    };
    
  } catch (error) {
    console.error('Failed to send audio chunk:', error);
  }
}

// Upload complete audio to backend
async function uploadAudioToBackend() {
  try {
    const { token } = await chrome.storage.local.get('token');
    
    if (!token || !recordingState.meetingId) return;
    
    // Combine all audio chunks
    const audioBlob = new Blob(recordingState.audioChunks, { type: 'audio/webm' });
    
    // Create form data
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    
    // Upload to backend
    const response = await fetch(
      `${API_BASE_URL}/api/meetings/${recordingState.meetingId}/upload-audio`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to upload audio');
    }
    
    const result = await response.json();
    console.log('Audio uploaded successfully:', result);
    
    // Send transcript to content script
    if (recordingState.currentTab) {
      chrome.tabs.sendMessage(recordingState.currentTab, {
        type: 'TRANSCRIPTION_COMPLETE',
        data: result
      });
    }
    
  } catch (error) {
    console.error('Failed to upload audio:', error);
  }
}

// Create highlight
async function createHighlight() {
  if (!recordingState.isRecording || !recordingState.meetingId) {
    console.log('Cannot create highlight: not recording');
    return;
  }
  
  try {
    const { token } = await chrome.storage.local.get('token');
    
    // Calculate current timestamp
    const currentTime = Date.now() - recordingState.startTime;
    const startTime = Math.max(0, currentTime - 30000); // 30 seconds before
    const endTime = currentTime;
    
    const response = await fetch(
      `${API_BASE_URL}/api/meetings/${recordingState.meetingId}/highlights`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: 'Highlight',
          start_time: startTime / 1000,
          end_time: endTime / 1000
        })
      }
    );
    
    if (response.ok) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Highlight Created',
        message: 'Your highlight has been saved!'
      });
    }
    
  } catch (error) {
    console.error('Failed to create highlight:', error);
  }
}

// Toggle transcript overlay
function toggleTranscript() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'TOGGLE_TRANSCRIPT'
      });
    }
  });
}

// Handle meeting detected
function handleMeetingDetected(data, tabId) {
  console.log('Meeting detected:', data);
  
  // Show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'Meeting Detected',
    message: `${data.platform} meeting detected. Click the extension to start recording.`
  });
}

// Handle audio chunk from content script
function handleAudioChunk(data) {
  // Process audio chunk
  console.log('Audio chunk received:', data);
}

// Helper: Get current tab URL
async function getCurrentTabUrl() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0]?.url || '';
}

// Handle create highlight request
async function handleCreateHighlight(data) {
  await createHighlight();
}

console.log('MeetNote background service worker loaded');
