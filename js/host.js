// ========================
// YOUR CREDENTIALS
// ========================
const API_KEY = 'AIzaSyDXJXzqI6u-EMmKHsEc0p8NqU7dHUwAGuw';
const CLIENT_ID = '930976233298-a1n7ggo6b79d4d1jgehfo5f38o6qa583.apps.googleusercontent.com';
const APP_ID = '930976233298';
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

// ========================
// Global Variables
// ========================
let tokenClient;
let gisReady = false;

const authButton = document.getElementById('authorize_button');
const fileInfoDiv = document.getElementById('file-info');
const fileNameP = document.getElementById('file-name');

/**
 * Load a script by URL dynamically
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Initialize Google Identity Services
 */
async function initializeAuth() {
  try {
    await loadScript('https://accounts.google.com/gsi/client');
    console.log("1. GIS script loaded.");

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: handleTokenResponse,
    });
    gisReady = true;
    console.log("2. GIS token client initialized.");

    if (authButton) {
      authButton.disabled = false;
      authButton.innerText = "Select from Google Drive";
    }
  } catch (err) {
    console.error("Error loading GIS:", err);
    if (authButton) {
      authButton.innerText = "Initialization Error";
      authButton.disabled = true;
    }
  }
}

/**
 * On page load
 */
document.addEventListener('DOMContentLoaded', () => {
  initializeAuth();
  if (authButton) authButton.onclick = handleAuthClick;
});

/**
 * Request access token on button click
 */
function handleAuthClick() {
  if (gisReady && tokenClient) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    console.error("Auth client not ready");
  }
}

/**
 * Handle OAuth token and load Picker
 */
async function handleTokenResponse(resp) {
  if (resp.error !== undefined) {
    console.error('Token error:', resp);
    return;
  }
  console.log("Access token received.");

  try {
    await loadScript('https://apis.google.com/js/api.js');
    await new Promise((resolve, reject) => gapi.load('picker', { callback: resolve, onerror: reject }));
    console.log("Picker loaded.");
    createPicker(resp.access_token);
  } catch (err) {
    console.error("Failed to load Picker:", err);
  }
}

/**
 * Create and open the Picker
 */
function createPicker(accessToken) {
  console.log("Opening Picker...");

  // Create a view that shows all files and allows folder navigation
  const view = new google.picker.DocsView()
    .setIncludeFolders(true);
    // The line that was filtering for videos has been removed to fix the issue.

  const picker = new google.picker.PickerBuilder()
    .setOAuthToken(accessToken)
    .setDeveloperKey(API_KEY)
    .setAppId(APP_ID)
    .setOrigin(window.location.protocol + '//' + window.location.host)
    .addView(view)
    .enableFeature(google.picker.Feature.NAV_HIDDEN) // Hides the navigation panel on the left
    .setCallback(pickerCallback)
    .build();

  picker.setVisible(true);
}

/**
 * Picker callback on file selection
 */
function pickerCallback(data) {
  if (data.action === google.picker.Action.PICKED) {
    const doc = data.docs[0];
    const fileId = doc.id;
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // --- NEW: Call your backend to create the room ---
    fetch(' https://1fa63c5e0cb7.ngrok-free.app/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode, fileId }),
    })
    .then(response => response.json())
    .then(data => {
      if (data.roomCode) {
        console.log(`Room ${data.roomCode} created on the server.`);
        // Redirect to the watch page
        window.location.href = `watch.html?fileId=${fileId}&roomCode=${roomCode}`;
      } else {
        throw new Error('Failed to create room on server.');
      }
    })
    .catch(error => {
      console.error("Could not create room on server:", error);
      alert("Error: Could not create the room. Please try again.");
    });
    // --- END NEW ---

  } else if (data.action === google.picker.Action.CANCEL) {
    console.log('Picker was cancelled.');
  }
}
