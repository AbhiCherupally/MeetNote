/**
 * Popup Script - Extension popup UI logic
 */

const API_BASE_URL = 'http://127.0.0.1:8000';  // Local development
// For production, change to: 'https://meetnote-backend.onrender.com'

// DOM Elements
let loginSection, registerSection, authenticatedView, unauthenticatedView;
let recordBtn, highlightBtn, toggleTranscriptBtn, logoutBtn;
let loginBtn, registerBtn, showRegisterBtn, showLoginBtn;
let recordingStatus, backendStatus;

// State
let isRecording = false;
let token = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Get DOM elements
  loginSection = document.getElementById('login-section');
  registerSection = document.getElementById('register-section');
  authenticatedView = document.getElementById('authenticated-view');
  unauthenticatedView = document.getElementById('unauthenticated-view');
  
  recordBtn = document.getElementById('record-btn');
  highlightBtn = document.getElementById('highlight-btn');
  toggleTranscriptBtn = document.getElementById('toggle-transcript-btn');
  logoutBtn = document.getElementById('logout-btn');
  
  loginBtn = document.getElementById('login-btn');
  registerBtn = document.getElementById('register-btn');
  showRegisterBtn = document.getElementById('show-register-btn');
  showLoginBtn = document.getElementById('show-login-btn');
  
  recordingStatus = document.getElementById('recording-status');
  backendStatus = document.getElementById('backend-status');
  
  // Setup event listeners
  recordBtn.addEventListener('click', toggleRecording);
  highlightBtn.addEventListener('click', createHighlight);
  toggleTranscriptBtn.addEventListener('click', toggleTranscript);
  logoutBtn.addEventListener('click', logout);
  
  loginBtn.addEventListener('click', login);
  registerBtn.addEventListener('click', register);
  showRegisterBtn.addEventListener('click', showRegister);
  showLoginBtn.addEventListener('click', showLogin);
  
  // Check authentication
  const { token: storedToken } = await chrome.storage.local.get('token');
  
  if (storedToken) {
    token = storedToken;
    showAuthenticatedView();
  } else {
    showUnauthenticatedView();
  }
  
  // Check backend status
  checkBackendStatus();
  
  // Get recording state
  chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATE' }, (response) => {
    if (response && response.state.isRecording) {
      isRecording = true;
      updateRecordingUI();
    }
  });
});

// Show authenticated view
function showAuthenticatedView() {
  authenticatedView.style.display = 'block';
  unauthenticatedView.style.display = 'none';
}

// Show unauthenticated view
function showUnauthenticatedView() {
  authenticatedView.style.display = 'none';
  unauthenticatedView.style.display = 'block';
}

// Show register form
function showRegister() {
  loginSection.classList.remove('active');
  registerSection.classList.add('active');
}

// Show login form
function showLogin() {
  registerSection.classList.remove('active');
  loginSection.classList.add('active');
}

// Login
async function login() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  if (!email || !password) {
    alert('Please enter email and password');
    return;
  }
  
  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      throw new Error('Login failed');
    }
    
    const data = await response.json();
    token = data.access_token;
    
    // Store token
    await chrome.storage.local.set({ token });
    
    showAuthenticatedView();
    
  } catch (error) {
    alert('Login failed. Please check your credentials.');
    console.error('Login error:', error);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Login';
  }
}

// Register
async function register() {
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  
  if (!name || !email || !password) {
    alert('Please fill in all fields');
    return;
  }
  
  registerBtn.disabled = true;
  registerBtn.textContent = 'Creating account...';
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, password })
    });
    
    if (!response.ok) {
      throw new Error('Registration failed');
    }
    
    const data = await response.json();
    token = data.access_token;
    
    // Store token
    await chrome.storage.local.set({ token });
    
    showAuthenticatedView();
    
  } catch (error) {
    alert('Registration failed. Email may already be in use.');
    console.error('Registration error:', error);
  } finally {
    registerBtn.disabled = false;
    registerBtn.textContent = 'Create Account';
  }
}

// Logout
async function logout() {
  await chrome.storage.local.remove('token');
  token = null;
  showUnauthenticatedView();
}

// Toggle recording
async function toggleRecording() {
  if (isRecording) {
    // Stop recording
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
    isRecording = false;
  } else {
    // Start recording
    chrome.runtime.sendMessage({ type: 'START_RECORDING' });
    isRecording = true;
  }
  
  updateRecordingUI();
}

// Update recording UI
function updateRecordingUI() {
  if (isRecording) {
    recordBtn.textContent = '⏹️ Stop Recording';
    recordBtn.classList.remove('primary-btn');
    recordBtn.classList.add('danger-btn');
    
    recordingStatus.innerHTML = '<span class="recording-dot"></span> Recording';
    highlightBtn.disabled = false;
  } else {
    recordBtn.textContent = '🎙️ Start Recording';
    recordBtn.classList.remove('danger-btn');
    recordBtn.classList.add('primary-btn');
    
    recordingStatus.innerHTML = '<span>●</span> Ready';
    highlightBtn.disabled = true;
  }
}

// Create highlight
function createHighlight() {
  chrome.runtime.sendMessage({ type: 'CREATE_HIGHLIGHT' });
  
  // Show temporary feedback
  const originalText = highlightBtn.textContent;
  highlightBtn.textContent = '✓ Highlight Created!';
  setTimeout(() => {
    highlightBtn.textContent = originalText;
  }, 2000);
}

// Toggle transcript
function toggleTranscript() {
  chrome.runtime.sendMessage({ type: 'TOGGLE_TRANSCRIPT' });
}

// Check backend status
async function checkBackendStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (response.ok) {
      backendStatus.innerHTML = '<span style="color: #10b981;">●</span> Connected';
    } else {
      backendStatus.innerHTML = '<span style="color: #ef4444;">●</span> Offline';
    }
  } catch (error) {
    backendStatus.innerHTML = '<span style="color: #ef4444;">●</span> Offline';
  }
}

// Open dashboard
function openDashboard() {
  chrome.tabs.create({ url: 'https://meetnoteapp.netlify.app/meetings' });
}
