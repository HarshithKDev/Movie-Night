// ---> NEW: Listen for the 'authReady' event to ensure Firebase auth is initialized <---
document.addEventListener('authReady', () => {
    // All original code is now safely inside this listener
    const params = new URLSearchParams(window.location.search);
    const fileId = decodeURIComponent(params.get('fileId'));
    const roomCode = params.get('roomCode');

    // --- DOM Elements ---
    const roomCodeTextEl = document.getElementById('room-code-text');
    const copyRoomCodeBtn = document.getElementById('copy-room-code-btn');
    const exitButtonEl = document.getElementById('exit-button');
    const micBtn = document.getElementById('mic-btn');
    const cameraBtn = document.getElementById('camera-btn');
    const loadingOverlay = document.getElementById('loading-overlay');

    // --- Initialization ---
    if (!fileId || !roomCode) {
        alert('Missing room information. Redirecting...');
        window.location.href = 'index.html';
        return;
    }

    if (roomCodeTextEl) {
        roomCodeTextEl.textContent = roomCode;
    }
    
    const player = videojs('movie-player', { fluid: true, responsive: true });

    // We now call the main logic functions from within the event listener
    loadVideo(player, fileId);
    initializeAuthAndVideoCall(roomCode, player); // Pass player instance
    setupButtonListeners(player); // Pass player instance

    // --- Core Functions ---
    async function loadVideo(player, fileId) {
        try {
            // Using localhost for local development
            const backendUrl = 'http://localhost:3000';
            const token = localStorage.getItem('firebaseIdToken');
            const response = await fetch(`${backendUrl}/api/get-stream-url`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ publicUrl: fileId }),
            });
            if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
            const data = await response.json();
            player.src({ src: data.streamUrl, type: 'video/mp4' });
            player.ready(() => {
                loadingOverlay.classList.add('hidden');
            });
        } catch (error) {
            console.error(`Error loading video: ${error.message}`);
            loadingOverlay.classList.add('hidden');
            alert('Failed to load the video. Please check the room code or try again.');
        }
    }

    function initializeAuthAndVideoCall(roomCode, player) {
        // This will now work correctly because `auth` is guaranteed to be initialized
        auth.onAuthStateChanged(user => {
            if (user) {
                user.getIdToken().then(token => {
                    localStorage.setItem('firebaseIdToken', token); // Ensure token is fresh
                    setupVideoSync(player, roomCode, token); // Pass token to WebSocket setup
                    const userName = user.displayName || user.email.split('@')[0];
                    document.getElementById('local-user-name').textContent = userName;
                    if (typeof joinAndDisplayLocalStream === 'function') {
                        joinAndDisplayLocalStream(roomCode, userName);
                    }
                });
            } else {
                // Handle user not logged in
                alert('You must be logged in to join a room.');
                window.location.href = 'index.html';
            }
        });
    }

    function setupVideoSync(player, roomCode, token) {
        // ---> FIX: Define wsUrl here, inside the function where it's used <---
        // Use ws:// for local development
        const wsUrl = `ws://localhost:3000?roomCode=${roomCode}&token=${token}`;
        const ws = new WebSocket(wsUrl);
        let receivedEvent = false;
        
        ws.onopen = () => { 
            console.log('WebSocket connection established.');
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            alert('Could not connect to the session. Your login might be invalid or the server is down.');
            window.location.href = 'index.html';
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            receivedEvent = true;
            try {
                switch (data.type) {
                    case 'sync-state': 
                        player.currentTime(data.state.currentTime); 
                        data.state.isPlaying ? player.play() : player.pause(); 
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
            } catch (e) {
                console.error("Error handling player state:", e);
            }
            setTimeout(() => receivedEvent = false, 250);
        };

        const sendEvent = (type, time) => { 
            if (ws.readyState === WebSocket.OPEN && !receivedEvent) { 
                ws.send(JSON.stringify({ type, roomCode, time })); 
            } 
        };
        
        player.on('play', () => sendEvent('play', player.currentTime()));
        player.on('pause', () => sendEvent('pause', player.currentTime()));
        player.on('seeked', () => sendEvent('seek', player.currentTime()));
        
        // Make ws globally available on the window object so it can be closed
        window.ws = ws; 
    }

    function setupButtonListeners() {
        if(micBtn) micBtn.addEventListener('click', () => { if (typeof toggleMic === 'function') toggleMic(); });
        if(cameraBtn) cameraBtn.addEventListener('click', () => { if (typeof toggleCamera === 'function') toggleCamera(); });

        if(exitButtonEl) {
            exitButtonEl.addEventListener('click', async () => {
                if (typeof leaveChannel === 'function') await leaveChannel();
                if (window.ws) window.ws.close();
                window.location.href = 'index.html';
            });
        }

        if(copyRoomCodeBtn) {
            copyRoomCodeBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(roomCode);
                
                const originalIcon = copyRoomCodeBtn.innerHTML;
                copyRoomCodeBtn.innerHTML = `<i data-lucide="check" class="w-4 h-4 text-secondary"></i>`;
                lucide.createIcons();
    
                setTimeout(() => {
                    copyRoomCodeBtn.innerHTML = originalIcon;
                    lucide.createIcons();
                }, 2000);
            });
        }
    }
});