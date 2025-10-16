document.addEventListener('authReady', () => {
    const params = new URLSearchParams(window.location.search);
    const movieId = params.get('movieId');
    const roomCode = params.get('roomCode');

    // --- DOM Elements ---
    const roomCodeTextEl = document.getElementById('room-code-text');
    const copyRoomCodeBtn = document.getElementById('copy-room-code-btn');
    const exitButtonEl = document.getElementById('exit-button');
    const micBtn = document.getElementById('mic-btn');
    const cameraBtn = document.getElementById('camera-btn');
    const loadingOverlay = document.getElementById('loading-overlay');

    if (!movieId || !roomCode) {
        alert('Missing room information. Redirecting...');
        window.location.href = 'index.html';
        return;
    }

    if (roomCodeTextEl) {
        roomCodeTextEl.textContent = roomCode;
    }
    
    const player = videojs('movie-player', { fluid: true, responsive: true });

    loadVideo(player, movieId);
    initializeAuthAndVideoCall(roomCode, player);
    setupButtonListeners(player);

    async function loadVideo(player, movieId) {
        try {
            const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? 'http://localhost:3000'
                : 'https://movienight-backend-veka.onrender.com';
            const token = localStorage.getItem('firebaseIdToken');
            
            const response = await fetch(`${backendUrl}/api/movies/${movieId}/stream-url`, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${token}`
                }
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
            alert('Failed to load the video. You may not have permission or the room is invalid.');
            window.location.href = 'index.html';
        }
    }

    function initializeAuthAndVideoCall(roomCode, player) {
        auth.onAuthStateChanged(user => {
            if (user) {
                user.getIdToken().then(token => {
                    localStorage.setItem('firebaseIdToken', token);
                    setupVideoSync(player, roomCode, token);
                    const userName = user.displayName || user.email.split('@')[0];
                    document.getElementById('local-user-name').textContent = userName;
                    if (typeof joinAndDisplayLocalStream === 'function') {
                        joinAndDisplayLocalStream(roomCode, userName);
                    }
                });
            } else {
                alert('You must be logged in to join a room.');
                window.location.href = 'index.html';
            }
        });
    }

    function setupVideoSync(player, roomCode, token) {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const wsProtocol = isLocal ? 'ws' : 'wss';
        const wsHost = isLocal ? 'localhost:3000' : 'movienight-backend-veka.onrender.com';
        const wsUrl = `${wsProtocol}://${wsHost}?roomCode=${roomCode}&token=${token}`;

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