// This configuration should be from your Firebase project settings.
const firebaseConfig = {
  apiKey: "AIzaSyAc35kVMuZnxOZ85HIBGG-plHzOqvh1U5E",
  authDomain: "movienight-firebase.firebaseapp.com",
  projectId: "movienight-firebase",
  storageBucket: "movienight-firebase.firebasestorage.app",
  messagingSenderId: "6358321439",
  appId: "1:6358321439:web:ec508f74d398eda996482a"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

// --- DOM Elements ---
const authLoadingView = document.getElementById('auth-loading-view');
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

// --- Event Listeners ---
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
                .catch(error => {
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
        if (usernameInput) usernameInput.parentElement.classList.add('hidden');
        if (authBtn) authBtn.textContent = 'Log In';
        if (toggleText) toggleText.textContent = "Don't have an account?";
        if (toggleAuthModeBtn) toggleAuthModeBtn.textContent = 'Sign Up';
    } else {
        if (usernameInput) usernameInput.parentElement.classList.remove('hidden');
        if (authBtn) authBtn.textContent = 'Sign Up';
        if (toggleText) toggleText.textContent = "Already have an account?";
        if (toggleAuthModeBtn) toggleAuthModeBtn.textContent = 'Log In';
    }
    if (authErrorEl) authErrorEl.textContent = '';
}

// --- Auth State Observer ---
auth.onAuthStateChanged(user => {
    if (authLoadingView) authLoadingView.classList.add('hidden');

    if (user) {
        if (userNameEl) userNameEl.textContent = user.displayName || user.email;
        if (loggedInView) loggedInView.classList.remove('hidden');
        if (loggedOutView) loggedOutView.classList.add('hidden');
    } else {
        if (loggedInView) loggedInView.classList.add('hidden');
        if (loggedOutView) loggedOutView.classList.remove('hidden');
        if (isLoginMode === false) updateAuthUI(); // Ensure correct view on logout
    }
});