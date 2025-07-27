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
        playbackRates: [0.5, 1, 1.25, 1.5, 2]
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
        const iconContainer = document.getElementById('icon-background');
        if (!iconContainer) return;

        const icons = [
            '🎬', '🍿', '🎥', '🎞️', '🎟️', '🎭', '⭐', '📽️',
            '🎪', '🎨', '🎯', '🎲', '🎸', '🎺', '🎵', '🎶',
            '🌟', '✨', '💫', '🔥', '💎', '🏆', '🎊', '🎉'
        ];

        for (let i = 0; i < 25; i++) {
            createFloatingIcon(iconContainer, icons);
        }

        setInterval(() => {
            createFloatingIcon(iconContainer, icons);
            cleanupIcons(iconContainer);
        }, 3000);
    }

    function createFloatingIcon(container, icons) {
        const icon = document.createElement('span');
        icon.classList.add('moving-icon');
        icon.innerText = icons[Math.floor(Math.random() * icons.length)];
        
        const size = Math.random() * 2 + 1;
        const left = Math.random() * 100;
        const duration = Math.random() * 20 + 30;
        const delay = Math.random() * -10;
        
        icon.style.fontSize = `${size}rem`;
        icon.style.left = `${left}vw`;
        icon.style.animationDuration = `${duration}s`;
        icon.style.animationDelay = `${delay}s`;
        icon.style.bottom = `-${size}rem`;
        icon.dataset.created = Date.now();
        
        container.appendChild(icon);
    }

    function cleanupIcons(container) {
        const icons = container.querySelectorAll('.moving-icon');
        const now = Date.now();
        icons.forEach(icon => {
            if (now - parseInt(icon.dataset.created) > 40000) {
                icon.remove();
            }
        });
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
        const playerWrapper = document.getElementById('video-js-wrapper');
        if (playerWrapper) {
            playerWrapper.innerHTML = `
                <div class="w-full h-full flex items-center justify-center text-center p-8">
                    <div>
                        <div class="text-6xl mb-6">🎬💥</div>
                        <h3 class="text-2xl font-bold text-red-400 mb-4">Video Load Error</h3>
                        <p class="text-slate-300 mb-6">${errorMessage}</p>
                        <div class="space-y-3">
                            <button onclick="location.reload()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-all">
                                🔄 Try Again
                            </button>
                            <br>
                            <a href="index.html" class="text-slate-400 hover:text-white transition-colors">
                                ← Back to Home
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }
        
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
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
        const nameElement = document.getElementById('local-user-name');
        if (nameElement) {
            nameElement.innerHTML = `<span class="mr-1">👤</span><span>${name}</span>`;
        }
    }

    /**
     * Setup WebSocket for video synchronization
     */
    function setupVideoSync(player, roomCode) {
        const wsUrl = 'wss://movienight-backend-veka.onrender.com';
        const ws = new WebSocket(wsUrl);
        let receivedEvent = false;
        let isConnected = false;

        ws.onopen = () => {
            console.log('🔗 Connected to sync server');
            isConnected = true;
            ws.send(JSON.stringify({ type: 'join', roomCode }));
            showNotification('Connected to sync server', 'success');
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            receivedEvent = true;
            
            console.log('📡 Sync event received:', data.type);
            
            switch (data.type) {
                case 'sync-state':
                    const { isPlaying, currentTime } = data.state;
                    player.currentTime(currentTime);
                    if (isPlaying && player.paused()) {
                        player.play();
                    } else if (!isPlaying && !player.paused()) {
                        player.pause();
                    }
                    break;
                    
                case 'play':
                    if (player.paused()) player.play();
                    break;
                    
                case 'pause':
                    if (!player.paused()) player.pause();
                    break;
                    
                case 'seek':
                    player.currentTime(data.time);
                    break;
            }
            
            setTimeout(() => { receivedEvent = false; }, 250);
        };

        ws.onclose = () => {
            console.log('🔌 Disconnected from sync server');
            isConnected = false;
            showNotification('Disconnected from sync server', 'warning');
        };

        ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            showNotification('Sync connection error', 'error');
        };

        function sendPlaybackEvent(type, time = null) {
            if (ws.readyState === WebSocket.OPEN && !receivedEvent && isConnected) {
                const message = { type, roomCode };
                if (time !== null) message.time = time;
                ws.send(JSON.stringify(message));
                console.log('📤 Sync event sent:', type);
            }
        }

        player.on('play', () => sendPlaybackEvent('play'));
        player.on('pause', () => sendPlaybackEvent('pause'));
        player.on('seeked', () => sendPlaybackEvent('seek', player.currentTime()));

        window.movieWS = ws;
    }

    /**
     * Setup enhanced video controls
     */
    function setupEnhancedControls(player, unmuteOverlay, micBtn, cameraBtn) {
        unmuteOverlay.addEventListener('click', () => {
            player.muted(false);
            player.volume(1.0);
            
            unmuteOverlay.style.opacity = '0';
            setTimeout(() => {
                unmuteOverlay.style.display = 'none';
                player.play();
            }, 300);
            
            showNotification('🔊 Audio enabled! Enjoy the movie!', 'success');
        }, { once: true });

        let micMuted = false;
        micBtn.addEventListener('click', () => {
            micMuted = !micMuted;
            
            if (micMuted) {
                micBtn.classList.add('muted');
                micBtn.innerHTML = `
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M13.58 11.75a.75.75 0 01.75.75c0 2.33-1.47 4.32-3.54 5.1V19h.5a.75.75 0 010 1.5h-4.5a.75.75 0 010-1.5h.5v-1.4c-2.07-.78-3.54-2.77-3.54-5.1a.75.75 0 011.5 0c0 1.66 1.34 3 3 3s3-1.34 3-3a.75.75 0 01.75-.75z" clip-rule="evenodd"/>
                        <path d="M8.25 2A2.25 2.25 0 006 4.25v3.5a2.25 2.25 0 004.5 0V4.25A2.25 2.25 0 008.25 2z"/>
                        <path stroke="currentColor" stroke-width="2" d="M3 3l14 14"/>
                    </svg>
                `;
                showNotification('🔇 Microphone muted', 'info');
            } else {
                micBtn.classList.remove('muted');
                micBtn.innerHTML = `
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clip-rule="evenodd"/>
                    </svg>
                `;
                showNotification('🎤 Microphone enabled', 'success');
            }
            
            if (typeof toggleMic === 'function') {
                toggleMic();
            }
        });

        let cameraOff = false;
        cameraBtn.addEventListener('click', () => {
            cameraOff = !cameraOff;
            
            if (cameraOff) {
                cameraBtn.classList.add('muted');
                cameraBtn.innerHTML = `
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 5a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586l-.707-.707A1 1 0 0012.293 4H7.707a1 1 0 00-.707.293L6.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
                        <path stroke="currentColor" stroke-width="2" d="M3 3l14 14"/>
                    </svg>
                `;
                showNotification('📹 Camera turned off', 'info');
            } else {
                cameraBtn.classList.remove('muted');
                cameraBtn.innerHTML = `
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 5a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586l-.707-.707A1 1 0 0012.293 4H7.707a1 1 0 00-.707.293L6.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
                    </svg>
                `;
                showNotification('📷 Camera turned on', 'success');
            }
            
            if (typeof toggleCamera === 'function') {
                toggleCamera();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch (e.key.toLowerCase()) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    if (player.paused()) {
                        player.play();
                    } else {
                        player.pause();
                    }
                    break;
                    
                case 'm':
                    e.preventDefault();
                    micBtn.click();
                    break;
                    
                case 'c':
                    e.preventDefault();
                    cameraBtn.click();
                    break;
                    
                case 'f':
                    e.preventDefault();
                    if (player.isFullscreen()) {
                        player.exitFullscreen();
                    } else {
                        player.requestFullscreen();
                    }
                    break;
            }
        });
    }

    /**
     * Setup button interactions
     */
    function setupButtonInteractions(exitButtonEl, copyBtn, roomCode) {
        exitButtonEl.onclick = async () => {
            const confirmed = confirm('🚪 Are you sure you want to leave the movie room?');
            if (!confirmed) return;
            
            exitButtonEl.innerHTML = '🔄 Leaving...';
            exitButtonEl.disabled = true;
            
            try {
                if (typeof leaveChannel === 'function') {
                    await leaveChannel();
                }
                
                if (window.movieWS) {
                    window.movieWS.close();
                }
                
                showNotification('👋 Left the room successfully', 'success');
                
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
                
            } catch (error) {
                console.error('Error leaving room:', error);
                showNotification('Error leaving room', 'error');
                exitButtonEl.innerHTML = '🚪 Exit Room';
                exitButtonEl.disabled = false;
            }
        };

        copyBtn.onclick = async () => {
            try {
                await navigator.clipboard.writeText(roomCode);
                
                const roomCodeText = copyBtn.querySelector('#room-code-text');
                const originalHTML = roomCodeText.innerHTML;
                
                roomCodeText.innerHTML = 'Copied!';
                copyBtn.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.9) 0%, rgba(21, 128, 61, 0.9) 100%)';
                
                setTimeout(() => {
                    roomCodeText.innerHTML = originalHTML;
                    copyBtn.style.background = '';
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
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = 'notification fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-lg max-w-sm transition-all duration-300 transform translate-x-full';
        
        const colors = {
            success: 'bg-green-600/90 backdrop-blur-sm border border-green-500/30 text-white',
            error: 'bg-red-600/90 backdrop-blur-sm border border-red-500/30 text-white',
            warning: 'bg-yellow-600/90 backdrop-blur-sm border border-yellow-500/30 text-white',
            info: 'bg-indigo-600/90 backdrop-blur-sm border border-indigo-500/30 text-white'
        };
        
        notification.className += ` ${colors[type]}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        notification.innerHTML = `
            <div class="flex items-center">
                <span class="text-xl mr-3">${icons[type]}</span>
                <span class="font-medium">${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    /**
     * Update participants UI (called by videocall.js)
     */
    window.updateParticipantsUI = function() {
        const remoteParticipants = document.getElementById('remote-participants');
        const waitingElement = document.getElementById('waiting-participants');
        
        if (remoteParticipants && remoteParticipants.children.length > 0) {
            if (waitingElement) waitingElement.style.display = 'none';
        } else {
            if (waitingElement) waitingElement.style.display = 'flex';
        }
    };

    /**
     * Add remote participant (called by videocall.js)
     */
    window.addRemoteParticipant = function(userId, userName) {
        const remoteContainer = document.getElementById('remote-participants');
        if (!remoteContainer) return;

        const participantEl = document.createElement('div');
        participantEl.className = 'participant-card flex-shrink-0';
        participantEl.id = `participant-${userId}`;
        
        participantEl.innerHTML = `
            <div class="aspect-video relative">
                <div id="remote-player-${userId}" class="w-full h-full bg-slate-800 rounded-lg overflow-hidden video-container"></div>
                <div class="participant-name">
                    <span class="mr-1">👤</span>
                    <span>${userName}</span>
                </div>
            </div>
        `;
        
        remoteContainer.appendChild(participantEl);
        updateParticipantsUI();
        
        showNotification(`👋 ${userName} joined the room!`, 'success');
    };

    /**
     * Remove remote participant (called by videocall.js)
     */
    window.removeRemoteParticipant = function(userId, userName) {
        const participantEl = document.getElementById(`participant-${userId}`);
        if (participantEl) {
            participantEl.style.opacity = '0';
            participantEl.style.transform = 'scale(0.9)';
            
            setTimeout(() => {
                participantEl.remove();
                updateParticipantsUI();
            }, 300);
            
            if (userName) {
                showNotification(`👋 ${userName} left the room`, 'info');
            }
        }
    };

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (window.movieWS) {
            window.movieWS.close();
        }
    });
});
