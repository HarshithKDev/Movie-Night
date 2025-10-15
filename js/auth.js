// --- State ---
let isLoginMode = true; // Start in login mode by default
let auth; // This will be initialized after fetching the config

// --- Asynchronous Firebase Initialization ---
async function initializeFirebase() {
  try {
    const backendUrl = 'http://localhost:3000'; // Using localhost for development
    const response = await fetch(`${backendUrl}/api/firebase-config`);

    if (!response.ok) {
      throw new Error('Could not fetch Firebase configuration.');
    }

    const firebaseConfig = await response.json();

    // Initialize Firebase
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    auth = firebase.auth();
    setupAuthListeners(); // Setup listeners after auth is initialized

    // ---> NEW: Announce that authentication is ready for other scripts <---
    document.dispatchEvent(new CustomEvent('authReady'));

  } catch (error) {
    console.error('Firebase initialization failed:', error);
    const authLoadingView = document.getElementById('auth-loading-view');
    if (authLoadingView) {
      authLoadingView.innerHTML = `<p class="text-error text-center">Failed to load the application. Please try again later.</p>`;
    }
  }
}

// Start the initialization process when the script loads
document.addEventListener('DOMContentLoaded', initializeFirebase);


// This function contains all the logic that depends on 'auth' being initialized
function setupAuthListeners() {
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
            if (window.lucide) {
                window.lucide.createIcons();
            }
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

    // --- Auth State Observer ---
    auth.onAuthStateChanged(user => {
        if (authLoadingView) authLoadingView.classList.add('hidden');

        if (user) {
            user.getIdToken().then(token => {
                localStorage.setItem('firebaseIdToken', token);
            });

            if (userNameEl) userNameEl.textContent = user.displayName || user.email;
            if (loggedInView) loggedInView.classList.remove('hidden');
            if (loggedOutView) loggedOutView.classList.add('hidden');
        } else {
            localStorage.removeItem('firebaseIdToken');
            if (loggedInView) loggedInView.classList.add('hidden');
            if (loggedOutView) loggedOutView.classList.remove('hidden');
        }
    });

    // Initial UI setup based on the default mode
    updateAuthUI();
}

function getFriendlyErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'Invalid email or password.';
        case 'auth/email-already-in-use':
            return 'An account with this email already exists.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters.';
        default:
            return 'An unexpected error occurred. Please try again.';
    }
}