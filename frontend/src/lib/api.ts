// API configuration and utilities for connecting to the live backend
const API_BASE_URL = 'https://meetnote.onrender.com';

export const api = {
  baseURL: API_BASE_URL,
  
  // Health check
  async checkHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  },
  
  // Meeting endpoints
  async createMeeting(meetingData: any) {
    const response = await fetch(`${API_BASE_URL}/meetings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(meetingData),
    });
    return response.json();
  },
  
  async getMeetings() {
    const response = await fetch(`${API_BASE_URL}/meetings`);
    return response.json();
  },
  
  // AI analysis
  async analyzeTranscript(transcript: string) {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcript }),
    });
    return response.json();
  },
};

export default api;