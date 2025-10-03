// Offscreen document for audio recording
// This is the ONLY context that can access getUserMedia in MV3

let mediaRecorder = null;
let audioChunks = [];
let recordingStream = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('🎧 Offscreen: Received message:', message.type);
  
  if (message.type === 'START_OFFSCREEN_RECORDING') {
    startRecording(message.streamId)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, message: error.message }));
    return true;
  }
  
  if (message.type === 'STOP_OFFSCREEN_RECORDING') {
    stopRecording()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, message: error.message }));
    return true;
  }
});

async function startRecording(streamId) {
  try {
    console.log('🎤 Offscreen: Starting recording with stream ID:', streamId);
    
    // Get the tab audio stream using the stream ID
    recordingStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      },
      video: false
    });
    
    console.log('✅ Offscreen: Got audio stream');
    
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
      ? 'audio/webm;codecs=opus' 
      : 'audio/webm';
    
    mediaRecorder = new MediaRecorder(recordingStream, { mimeType });
    audioChunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        console.log('📦 Offscreen: Audio chunk:', event.data.size, 'bytes');
        audioChunks.push(event.data);
        
        // Send chunks to background every 2 chunks (10 seconds)
        if (audioChunks.length >= 2) {
          sendChunksToBackground(audioChunks.slice());
          audioChunks = [];
        }
      }
    };
    
    mediaRecorder.onstop = () => {
      console.log('⏹️ Offscreen: Recording stopped');
      
      // Send remaining chunks
      if (audioChunks.length > 0) {
        sendChunksToBackground(audioChunks.slice());
        audioChunks = [];
      }
      
      // Stop stream
      if (recordingStream) {
        recordingStream.getTracks().forEach(track => track.stop());
        recordingStream = null;
      }
      
      // Notify background
      chrome.runtime.sendMessage({ type: 'OFFSCREEN_RECORDING_STOPPED' });
    };
    
    mediaRecorder.start(5000); // Capture every 5 seconds
    console.log('✅ Offscreen: Recording started');
    
  } catch (error) {
    console.error('❌ Offscreen: Recording failed:', error);
    throw error;
  }
}

async function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
}

async function sendChunksToBackground(chunks) {
  try {
    const audioBlob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
    
    // Convert to base64
    const reader = new FileReader();
    const base64Audio = await new Promise((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
    
    console.log('📤 Offscreen: Sending audio to background');
    
    // Send to background for transcription
    chrome.runtime.sendMessage({
      type: 'PROCESS_AUDIO_CHUNK',
      audioData: base64Audio
    });
    
  } catch (error) {
    console.error('❌ Offscreen: Failed to send chunks:', error);
  }
}
