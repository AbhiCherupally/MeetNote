// API configuration and utilities
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://meetnote.onrender.com';

class MeetNoteAPI {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Authentication
  async register(email, password, name) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    
    if (data.token) {
      this.token = data.token;
      localStorage.setItem('meetnote_token', data.token);
    }
    
    return data;
  }

  async login(email, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (data.token) {
      this.token = data.token;
      localStorage.setItem('meetnote_token', data.token);
    }
    
    return data;
  }

  // Meetings
  async getMeetings() {
    return await this.request('/api/meetings');
  }

  async createMeeting(meeting) {
    return await this.request('/api/meetings', {
      method: 'POST',
      body: JSON.stringify(meeting),
    });
  }

  async analyzeMeeting(meetingId, transcript) {
    return await this.request(`/api/meetings/${meetingId}/analyze`, {
      method: 'POST',
      body: JSON.stringify({ transcript }),
    });
  }

  // Health check
  async healthCheck() {
    return await this.request('/health');
  }

  // Initialize from stored token
  init() {
    const storedToken = localStorage.getItem('meetnote_token');
    if (storedToken) {
      this.token = storedToken;
    }
  }

  // Logout
  logout() {
    this.token = null;
    localStorage.removeItem('meetnote_token');
  }
}

// Export singleton instance
export const meetNoteAPI = new MeetNoteAPI();

// React hooks for API integration
export const useAPI = () => {
  return {
    api: meetNoteAPI,
    isConnected: !!meetNoteAPI.token,
  };
};

export default meetNoteAPI;