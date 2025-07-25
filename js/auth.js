// This configuration is from your Firebase project settings.
const firebaseConfig = {
  apiKey: "AIzaSyAc35kVMuZnxOZ85HIBGG-plHzOqvh1U5E",
  authDomain: "movienight-firebase.firebaseapp.com",
  projectId: "movienight-firebase",
  storageBucket: "movienight-firebase.firebasestorage.app",
  messagingSenderId: "6358321439",
  appId: "1:6358321439:web:ec508f74d398eda96482a"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
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

// --- Event Listeners ---
toggleAuthModeBtn.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    updateAuthUI();
});

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

logoutBtn.addEventListener('click', () => {
    auth.signOut();
});

// --- UI Update Function ---
function updateAuthUI() {
    if (isLoginMode) {
        usernameInput.classList.add('hidden');
        authBtn.textContent = 'Log In';
        toggleText.textContent = "Don't have an account?";
        toggleAuthModeBtn.textContent = 'Sign Up';
    } else {
        usernameInput.classList.remove('hidden');
        authBtn.textContent = 'Sign Up';
        toggleText.textContent = "Already have an account?";
        toggleAuthModeBtn.textContent = 'Log In';
    }
    authErrorEl.textContent = ''; // Clear errors on mode switch
}

// --- Auth State Observer ---
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in.
        console.log("User is logged in:", user.displayName);
        userNameEl.textContent = user.displayName || user.email; // Fallback to email if no display name
        loggedInView.classList.remove('hidden');
        loggedOutView.classList.add('hidden');
    } else {
        // User is signed out.
        console.log("User is logged out.");
        loggedInView.classList.add('hidden');
        loggedOutView.classList.remove('hidden');
        updateAuthUI(); // Ensure form is in the correct state on logout
    }
});
