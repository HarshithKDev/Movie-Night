// Enhanced watch.js with cinematic animations and professional video player
// This file requires auth.js to be loaded first to access firebase and auth objects.

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize background animation
    initializeBackgroundAnimation();
    
    // Get URL parameters
    const params = new URLSearchParams(window.location.search);
    const fileId = decodeURIComponent(params.get('fileId'));
    const roomCode = params.get('roomCode');

    // DOM Elements
    const roomCodeTextEl = document.getElementById('room-code-text'); // Changed ID
    const exitButtonEl = document.getElementById('exit-button');
    const copyRoomCodeBtn = document.getElementById('copy-room-code-btn'); // Changed ID
    const micBtn = document.getElementById('mic-btn');
    const cameraBtn = document.getElementById('camera-btn');
    const unmuteOverlay = document.getElementById('unmute-overlay');
    const loadingOverlay = document.getElementById('loading-overlay');
    const waitingParticipants = document.getElementById('waiting-participants');

    // Validate required parameters
    if (!fileId || !roomCode) {
        showNotification('Missing room information. Redirecting...', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    // Set room code with animation
    animateRoomCode(roomCodeTextEl, roomCode);
    
    // Initialize video player
    const player = videojs('movie-player', {
        fluid: true,
        responsive: true,
        playbackRates: [0.5, 1, 1.25, 1.5, 2],
        plugins: {
            hotkeys: {
                volumeStep: 0.1,
                seekStep: 5,
                enableModifiersForNumbers: false
            }
        }
    });

    // Load video with enhanced error handling
    await loadVideo(player, fileId, loadingOverlay);

    // Initialize authentication and video call
    initializeAuth();

    // Setup WebSocket for video synchronization
    setupVideoSync(player, roomCode);

    // Setup enhanced controls
    setupEnhancedControls(player, unmuteOverlay, micBtn, cameraBtn);

    // Setup button interactions
    setupButtonInteractions(exitButtonEl, copyRoomCodeBtn, roomCode);

    /**
     * Initialize floating background animation
     */
    function initializeBackgroundAnimation() {
        // This function is for decorative purposes and can be kept as is.
    }

    function createFloatingIcon(container, icons) {
        // This function is for decorative purposes and can be kept as is.
    }

    function cleanupIcons(container) {
        // This function is for decorative purposes and can be kept as is.
    }

    /**
     * Animate room code display
     */
    function animateRoomCode(element, code) {
        if (!element) return;
        element.textContent = '';
        let index = 0;
        
        const typeInterval = setInterval(() => {
            element.textContent += code[index];
            index++;
            
            if (index >= code.length) {
                clearInterval(typeInterval);
                if (element.parentElement) {
                    element.parentElement.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.3)';
                }
            }
        }, 100);
    }

    /**
     * Load video with enhanced error handling and loading states
     */
    async function loadVideo(player, fileId, loadingOverlay) {
        try {
            const backendUrl = 'https://movienight-backend-veka.onrender.com';
            
            const response = await fetch(`${backendUrl}/api/get-stream-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ publicUrl: fileId }),
            });

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            player.src({ src: data.streamUrl, type: 'video/mp4' });

            player.ready(() => {
                console.log('✅ Video player ready');
                loadingOverlay.style.opacity = '0';
                setTimeout(() => {
                    loadingOverlay.style.display = 'none';
                }, 500);
            });

            player.on('loadedmetadata', () => {
                const audioTracks = player.audioTracks();
                if (audioTracks.length > 0) {
                    console.log(`✅ Audio tracks found: ${audioTracks.length}`);
                } else {
                    console.warn('⚠️ No audio tracks detected');
                    showNotification('This video may not have audio', 'warning');
                }
            });

            player.on('error', (error) => {
                console.error('❌ Video player error:', error);
                handleVideoError(player);
            });

        } catch (error) {
            console.error('❌ Failed to load video:', error);
            handleVideoError(player, error.message);
        }
    }

    /**
     * Handle video loading errors with user-friendly UI
     */
    function handleVideoError(player, errorMessage = 'Could not load video') {
        // This function can be kept as is.
    }

    /**
     * Initialize authentication and video call
     */
    function initializeAuth() {
        auth.onAuthStateChanged(user => {
            if (user) {
                const userName = user.displayName || user.email?.split('@')[0] || 'Guest';
                if (typeof joinAndDisplayLocalStream === 'function') {
                    joinAndDisplayLocalStream(roomCode, userName);
                }
                updateParticipantName(userName);
            } else {
                const guestName = `Guest${Math.floor(Math.random() * 1000)}`;
                if (typeof joinAndDisplayLocalStream === 'function') {
                    joinAndDisplayLocalStream(roomCode, guestName);
                }
                updateParticipantName(guestName);
            }
        });
    }

    /**
     * Update participant name in UI
     */
    function updateParticipantName(name) {
        // This function can be kept as is.
    }

    /**
     * Setup WebSocket for video synchronization
     */
    function setupVideoSync(player, roomCode) {
        // This function can be kept as is.
    }

    /**
     * Setup enhanced video controls
     */
    function setupEnhancedControls(player, unmuteOverlay, micBtn, cameraBtn) {
        // This function can be kept as is.
    }

    /**
     * Setup button interactions
     */
    function setupButtonInteractions(exitButtonEl, copyRoomCodeBtn, roomCode) {
        // Enhanced exit button
        exitButtonEl.onclick = async () => {
            // This logic can be kept as is.
        };

        // --- ✅ THIS IS THE FIX: Updated copy button logic ---
        copyRoomCodeBtn.onclick = async () => {
            try {
                await navigator.clipboard.writeText(roomCode);
                
                const roomCodeText = copyRoomCodeBtn.querySelector('#room-code-text');
                const originalText = roomCodeText.textContent;
                
                roomCodeText.textContent = '✅ Copied!';
                copyRoomCodeBtn.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.9) 0%, rgba(21, 128, 61, 0.9) 100%)';
                
                setTimeout(() => {
                    roomCodeText.textContent = originalText;
                    copyRoomCodeBtn.style.background = '';
                }, 2000);
                
                showNotification('📋 Room code copied to clipboard!', 'success');
                
            } catch (error) {
                console.error('Failed to copy room code:', error);
                showNotification('Failed to copy room code', 'error');
            }
        };
    }

    /**
     * Enhanced notification system
     */
    function showNotification(message, type = 'info') {
        // This function can be kept as is.
    }

    /**
     * Update participants UI (called by videocall.js)
     */
    window.updateParticipantsUI = function() {
        // This function can be kept as is.
    };

    /**
     * Add remote participant (called by videocall.js)
     */
    window.addRemoteParticipant = function(userId, userName) {
        // This function can be kept as is.
    };

    /**
     * Remove remote participant (called by videocall.js)
     */
    window.removeRemoteParticipant = function(userId, userName) {
        // This function can be kept as is.
    };

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (window.movieWS) {
            window.movieWS.close();
        }
    });
});
