const API_URL = 'https://meetnote-backend.onrender.com/api';

// Recording state
let mediaRecorder = null;
let audioChunks = [];
let transcript = [];
let recordingStream = null;
let isRecording = false;
let recordingStartTime = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Background received message:', message.type);
  
  if (message.type === 'START_RECORDING') {
    startRecording()
      .then(() => sendResponse({ success: true, message: 'Recording started' }))
      .catch(error => sendResponse({ success: false, message: error.message }));
    return true;
  }
  
  if (message.type === 'STOP_RECORDING') {
    stopRecording()
      .then(() => sendResponse({ success: true, message: 'Recording stopped' }))
      .catch(error => sendResponse({ success: false, message: error.message }));
    return true;
  }
  
  if (message.type === 'GET_RECORDING_STATUS') {
    sendResponse({ 
      isRecording, 
      duration: isRecording ? Date.now() - recordingStartTime : 0,
      transcriptLength: transcript.length
    });
    return false;
  }
  
  if (message.type === 'TRANSCRIBE_AUDIO') {
    transcribeAudio(message.audioData)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (message.type === 'SAVE_MEETING') {
    saveMeeting(message.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function transcribeAudio(audioData) {
  console.log('🎤 Background: Sending audio to backend API...');
  console.log('📊 Audio data length:', audioData.length);
  
  try {
    const response = await fetch(`${API_URL}/meetings/transcribe`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audio_data: audioData,
        format: 'webm'
      })
    });
    
    console.log('📡 Backend response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      throw new Error('Transcription failed: ' + response.status);
    }
    
    const result = await response.json();
    console.log('✅ Transcription result:', result);
    return result;
  } catch (error) {
    console.error('❌ Transcription request failed:', error);
    throw error;
  }
}

async function saveMeeting(meetingData) {
  const response = await fetch(`${API_URL}/meetings/create?title=${encodeURIComponent(meetingData.title)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: meetingData.transcript
    })
  });
  
  if (!response.ok) throw new Error('Failed to save meeting');
  return response.json();
}

// Recording functions using offscreen document (ONLY way in MV3)
async function startRecording() {
  try {
    console.log('🎤 Background: Starting recording...');
    
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      throw new Error('No active tab found');
    }
    
    console.log('📹 Background: Tab:', tab.url);
    
    // Get media stream ID for the tab
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id
    });
    
    if (!streamId) {
      throw new Error('Failed to get media stream ID');
    }
    
    console.log('✅ Background: Got stream ID');
    
    // Create offscreen document if needed
    await setupOffscreenDocument();
    
    // Tell offscreen document to start recording
    const response = await chrome.runtime.sendMessage({
      type: 'START_OFFSCREEN_RECORDING',
      streamId: streamId
    });
    
    if (!response || !response.success) {
      throw new Error('Offscreen recording failed to start');
    }
    
    isRecording = true;
    recordingStartTime = Date.now();
    transcript = [];
    
    console.log('✅ Background: Recording started');
    
    // Notify popup
    chrome.runtime.sendMessage({
      type: 'RECORDING_STARTED'
    });
    
  } catch (error) {
    console.error('❌ Background: Failed to start recording:', error);
    throw error;
  }
}

async function setupOffscreenDocument() {
  const path = 'offscreen.html';
  
  // Check if offscreen document already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  
  if (existingContexts.length > 0) {
    console.log('✅ Offscreen document already exists');
    return;
  }
  
  // Create offscreen document
  await chrome.offscreen.createDocument({
    url: path,
    reasons: ['USER_MEDIA'],
    justification: 'Recording audio from meeting tab for transcription'
  });
  
  console.log('✅ Offscreen document created');
}

// Listen for messages from offscreen document
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PROCESS_AUDIO_CHUNK') {
    processAudioChunk(message.audioData);
  }
  
  if (message.type === 'OFFSCREEN_RECORDING_STOPPED') {
    isRecording = false;
    
    // Notify popup
    chrome.runtime.sendMessage({
      type: 'RECORDING_STOPPED',
      transcriptLength: transcript.length
    });
  }
});

async function stopRecording() {
  try {
    if (isRecording) {
      // Tell offscreen document to stop
      await chrome.runtime.sendMessage({
        type: 'STOP_OFFSCREEN_RECORDING'
      });
      
      // Wait for final processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Save meeting if we have transcript
      if (transcript.length > 0) {
        const title = `Meeting ${new Date().toLocaleString()}`;
        const result = await saveMeeting({ title, transcript });
        console.log('✅ Background: Meeting saved:', result);
        
        // Notify popup
        chrome.runtime.sendMessage({
          type: 'MEETING_SAVED',
          meeting: result
        });
      }
    }
  } catch (error) {
    console.error('❌ Background: Failed to stop recording:', error);
    throw error;
  }
}

async function processAudioChunk(base64Audio) {
  try {
    console.log('📤 Background: Sending to backend for transcription...');
    const result = await transcribeAudio(base64Audio);
    
    if (result && result.transcript) {
      if (Array.isArray(result.transcript)) {
        transcript.push(...result.transcript);
      } else if (result.transcript.text) {
        transcript.push({
          text: result.transcript.text,
          timestamp: new Date().toISOString(),
          speaker: 'Speaker'
        });
      }
      
      console.log('✅ Background: Transcript updated, total segments:', transcript.length);
      
      // Notify popup
      chrome.runtime.sendMessage({
        type: 'TRANSCRIPT_UPDATED',
        transcript: transcript
      });
    }
  } catch (error) {
    console.error('❌ Background: Failed to process audio:', error);
  }
}
