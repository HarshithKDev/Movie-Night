document.addEventListener('DOMContentLoaded', () => {
    const joinForm = document.getElementById('join-form');
    const roomCodeInput = document.getElementById('room-code-input');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const loadingOverlay = document.getElementById('loading-overlay');
    const inputGlow = document.getElementById('input-glow');

    // Enhanced input interactions
    if (roomCodeInput) {
        roomCodeInput.addEventListener('focus', () => {
            inputGlow.style.opacity = '1';
        });

        roomCodeInput.addEventListener('blur', () => {
            inputGlow.style.opacity = '0';
        });

        // Auto-format input as user types
        roomCodeInput.addEventListener('input', (e) => {
            const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            e.target.value = value;
            
            // Hide error message when user starts typing
            if (value.length > 0) {
                hideError();
            }
        });

        // Auto-submit when 6 characters are entered
        roomCodeInput.addEventListener('input', (e) => {
            if (e.target.value.length === 6) {
                setTimeout(() => {
                    joinForm.dispatchEvent(new Event('submit'));
                }, 500); // Small delay for better UX
            }
        });
    }

    if (joinForm) {
        joinForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const enteredCode = roomCodeInput.value.toUpperCase().trim();
            
            // Validation
            if (!enteredCode || enteredCode.length < 6) {
                showError('Please enter a valid 6-character room code.');
                shakeInput();
                return;
            }

            // Show loading state
            showLoading();

            // Use your deployed Render URL here
            const backendUrl = 'https://movienight-backend-veka.onrender.com';
            
            fetch(`${backendUrl}/api/rooms/${enteredCode}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Room not found');
                    }
                    return response.json();
                })
                .then(data => {
                    const fileId = data.fileId;
                    console.log(`Room ${enteredCode} found with file ${fileId}. Joining...`);
                    
                    // Success animation before redirect
                    showSuccess();
                    
                    // Redirect after success animation
                    setTimeout(() => {
                        // The fileId URL must be encoded before being put in the redirect URL
                        window.location.href = `watch.html?fileId=${encodeURIComponent(fileId)}&roomCode=${enteredCode}`;
                    }, 1500);
                })
                .catch(error => {
                    hideLoading();
                    showError(`Room "${enteredCode}" not found. Please check the code and try again.`);
                    shakeInput();
                    console.error('Error finding room:', error);
                });
        });
    }

    function showError(message) {
        if (errorMessage && errorText) {
            errorText.textContent = message;
            errorMessage.classList.remove('hidden');
            errorMessage.style.animation = 'slideIn 0.3s ease-out';
        }
    }

    function hideError() {
        if (errorMessage) {
            errorMessage.classList.add('hidden');
        }
    }

    function showLoading() {
        if (loadingOverlay) {
            loadingOverlay.classList.remove('hidden');
            loadingOverlay.style.animation = 'fadeIn 0.3s ease-out';
        }
    }

    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
    }

    function showSuccess() {
        if (loadingOverlay) {
            // Change loading text to success
            const loadingTitle = loadingOverlay.querySelector('h3');
            const loadingDesc = loadingOverlay.querySelector('p');
            const loadingIcon = loadingOverlay.querySelector('.animate-bounce');
            
            if (loadingTitle) loadingTitle.textContent = 'Room Found!';
            if (loadingDesc) loadingDesc.textContent = 'Redirecting you to the movie...';
            if (loadingIcon) {
                loadingIcon.textContent = '✅';
                loadingIcon.classList.remove('animate-bounce');
                loadingIcon.style.animation = 'pulse 1s ease-in-out infinite';
            }
        }
    }

    function shakeInput() {
        if (roomCodeInput) {
            roomCodeInput.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                roomCodeInput.style.animation = '';
            }, 500);
        }
    }

    // Add CSS animations dynamically
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
    `;
    document.head.appendChild(style);
});