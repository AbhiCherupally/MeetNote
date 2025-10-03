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
  const response = await fetch(`${API_URL}/meetings/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audio_data: audioData,
      format: 'webm'
    })
  });
  
  if (!response.ok) throw new Error('Transcription failed');
  return response.json();
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
