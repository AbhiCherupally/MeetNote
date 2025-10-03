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

// Recording functions using tabCapture API (Manifest V3)
async function startRecording() {
  try {
    console.log('🎤 Background: Starting tab audio capture...');
    
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      throw new Error('No active tab found');
    }
    
    console.log('📹 Background: Capturing audio from tab:', tab.url);
    
    // Get media stream ID for the tab (Manifest V3 approach)
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id
    });
    
    if (!streamId) {
      throw new Error('Failed to get media stream ID');
    }
    
    console.log('✅ Background: Got stream ID:', streamId);
    
    // Use getUserMedia with the stream ID
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      }
    });
    
    console.log('✅ Background: Tab audio stream captured');
    recordingStream = stream;
    
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
      ? 'audio/webm;codecs=opus' 
      : 'audio/webm';
    
    mediaRecorder = new MediaRecorder(stream, { mimeType });
    audioChunks = [];
    transcript = [];
    
    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        console.log('📦 Background: Audio chunk received:', event.data.size, 'bytes');
        audioChunks.push(event.data);
        
        // Process chunks in batches of 2 (every 10 seconds)
        if (audioChunks.length >= 2) {
          await processAudioChunks(audioChunks.slice());
          audioChunks = [];
        }
      }
    };
    
    mediaRecorder.onstop = async () => {
      console.log('⏹️ Background: Recording stopped');
      
      // Stop all tracks
      if (recordingStream) {
        recordingStream.getTracks().forEach(track => track.stop());
        recordingStream = null;
      }
      
      // Process remaining chunks
      if (audioChunks.length > 0) {
        await processAudioChunks(audioChunks.slice());
        audioChunks = [];
      }
      
      // Notify popup
      chrome.runtime.sendMessage({
        type: 'RECORDING_STOPPED',
        transcriptLength: transcript.length
      });
    };
    
    mediaRecorder.onerror = (event) => {
      console.error('❌ Background: MediaRecorder error:', event.error);
    };
    
    mediaRecorder.start(5000); // Capture every 5 seconds
    isRecording = true;
    recordingStartTime = Date.now();
    
    console.log('✅ Background: Recording started successfully');
    
    // Notify popup
    chrome.runtime.sendMessage({
      type: 'RECORDING_STARTED'
    });
    
  } catch (error) {
    console.error('❌ Background: Failed to start recording:', error);
    throw error;
  }
}

async function stopRecording() {
  try {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      isRecording = false;
      
      // Wait a bit for onstop to process
      await new Promise(resolve => setTimeout(resolve, 500));
      
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

async function processAudioChunks(chunks) {
  try {
    console.log('🎵 Background: Processing', chunks.length, 'audio chunks');
    const audioBlob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
    console.log('📦 Background: Created audio blob:', audioBlob.size, 'bytes');
    
    const reader = new FileReader();
    
    const base64Audio = await new Promise((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
    
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
    console.error('❌ Background: Failed to process audio chunks:', error);
  }
}
