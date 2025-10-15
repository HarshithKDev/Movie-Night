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
const passwordToggleBtn = document.getElementById('password-toggle-btn');
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

if (passwordToggleBtn) {
    passwordToggleBtn.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        passwordToggleBtn.innerHTML = type === 'password' ? '<i data-lucide="eye-off" class="w-5 h-5"></i>' : '<i data-lucide="eye" class="w-5 h-5"></i>';
        lucide.createIcons();
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
                    authErrorEl.textContent = getFriendlyErrorMessage(error.code);
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
                    authErrorEl.textContent = getFriendlyErrorMessage(error.code);
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
    // THIS IS THE FIX: Changed .remove('hidden') to .add('hidden')
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

function getFriendlyErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return 'Invalid email or password.';
        case 'auth/email-already-in-use':
            return 'An account with this email already exists.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters.';
        default:
            return 'An unexpected error occurred. Please try again.';
    }
}