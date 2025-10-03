const API_URL = 'https://meetnote-backend.onrender.com/api';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
