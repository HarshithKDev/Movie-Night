
// This configuration should be from your Firebase project settings.
const firebaseConfig = {
  apiKey: process.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

// --- DOM Elements ---
const authLoadingView = document.getElementById('auth-loading-view'); // ✅ NEW
const loggedOutView = document.getElementById('logged-out-view');
const loggedInView = document.getElementById('logged-in-view');
const userNameEl = document.getElementById('user-name');
const logoutBtn = document.getElementById('logout-btn');

const authForm = document.getElementById('auth-form');
const usernameInput = document.getElementById('username-input');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const authBtn = document.getElementById('auth-btn');
const authErrorEl = document.getElementById('auth-error');

const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
const toggleText = document.getElementById('toggle-text');

// --- State ---
let isLoginMode = false;

// --- Event Listeners (with checks to prevent errors) ---
if (toggleAuthModeBtn) {
    toggleAuthModeBtn.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        updateAuthUI();
    });
}

if (authForm) {
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;
        const username = usernameInput.value;

        authErrorEl.textContent = '';

        if (isLoginMode) {
            auth.signInWithEmailAndPassword(email, password)
                .catch(error => {
                    console.error("Login failed:", error);
                    authErrorEl.textContent = error.message;
                });
        } else {
            if (!username) {
                authErrorEl.textContent = 'Please enter a username.';
                return;
            }
            auth.createUserWithEmailAndPassword(email, password)
                .then(userCredential => {
                    return userCredential.user.updateProfile({
                        displayName: username
                    });
                })
                .then(() => {
                    console.log("User signed up and profile updated.");
                })
                .catch(error => {
                    console.error("Sign up failed:", error);
                    authErrorEl.textContent = error.message;
                });
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });
}

// --- UI Update Function ---
function updateAuthUI() {
    if (isLoginMode) {
        if (usernameInput) usernameInput.classList.add('hidden');
        if (authBtn) authBtn.innerHTML = 'Log In';
        if (toggleText) toggleText.textContent = "Don't have an account?";
        if (toggleAuthModeBtn) toggleAuthModeBtn.textContent = 'Sign Up';
    } else {
        if (usernameInput) usernameInput.classList.remove('hidden');
        if (authBtn) authBtn.innerHTML = 'Sign Up';
        if (toggleText) toggleText.textContent = "Already have an account?";
        if (toggleAuthModeBtn) toggleAuthModeBtn.textContent = 'Log In';
    }
    if (authErrorEl) authErrorEl.textContent = '';
}

// --- Auth State Observer ---
auth.onAuthStateChanged(user => {
    // ✅ FIX: Hide the loading spinner and show the correct view
    if (authLoadingView) authLoadingView.classList.add('hidden');

    if (user) {
        // User is signed in.
        console.log("User is logged in:", user.displayName);
        if (userNameEl) userNameEl.textContent = user.displayName || user.email;
        if (loggedInView) loggedInView.classList.remove('hidden');
        if (loggedOutView) loggedOutView.classList.add('hidden');
    } else {
        // User is signed out.
        console.log("User is logged out.");
        if (loggedInView) loggedInView.classList.add('hidden');
        if (loggedOutView) loggedOutView.classList.remove('hidden');
        updateAuthUI();
    }
});
