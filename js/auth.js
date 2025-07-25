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
// Check if Firebase is already initialized to prevent errors on page navigation
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

// --- DOM Elements ---
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
let isLoginMode = false; // Start in Sign Up mode

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

        authErrorEl.textContent = ''; // Clear previous errors

        if (isLoginMode) {
            // Handle Login
            auth.signInWithEmailAndPassword(email, password)
                .catch(error => {
                    console.error("Login failed:", error);
                    authErrorEl.textContent = error.message;
                });
        } else {
            // Handle Sign Up
            if (!username) {
                authErrorEl.textContent = 'Please enter a username.';
                return;
            }
            auth.createUserWithEmailAndPassword(email, password)
                .then(userCredential => {
                    // After creating the user, update their profile with the username
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
    // Check if elements exist before trying to modify them
    if (isLoginMode) {
        if (usernameInput) usernameInput.classList.add('hidden');
        if (authBtn) authBtn.textContent = 'Log In';
        if (toggleText) toggleText.textContent = "Don't have an account?";
        if (toggleAuthModeBtn) toggleAuthModeBtn.textContent = 'Sign Up';
    } else {
        if (usernameInput) usernameInput.classList.remove('hidden');
        if (authBtn) authBtn.textContent = 'Sign Up';
        if (toggleText) toggleText.textContent = "Already have an account?";
        if (toggleAuthModeBtn) toggleAuthModeBtn.textContent = 'Log In';
    }
    if (authErrorEl) authErrorEl.textContent = ''; // Clear errors on mode switch
}

// --- Auth State Observer ---
auth.onAuthStateChanged(user => {
    // Check if elements exist before trying to modify them
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
        updateAuthUI(); // Ensure form is in the correct state on logout
    }
});
