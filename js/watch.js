document.addEventListener('DOMContentLoaded', async () => {
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

    roomCodeTextEl.textContent = roomCode;
    
    const player = videojs('movie-player', { fluid: true, responsive: true });

    await loadVideo(player, fileId);
    initializeAuthAndVideoCall(roomCode);
    setupPlayerControls(player);
    setupButtonListeners();

    // --- Core Functions ---
    async function loadVideo(player, fileId) {
        try {
            const backendUrl = 'https://movienight-backend-veka.onrender.com';
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
        }
    }

    function initializeAuthAndVideoCall(roomCode) {
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
        const wsUrl = `wss://movienight-backend-veka.onrender.com?roomCode=${roomCode}&token=${token}`;
        const ws = new WebSocket(wsUrl);
        let receivedEvent = false;
        
        ws.onopen = () => { 
            console.log('WebSocket connection established.');
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            alert('Could not connect to the session. Your login might be invalid.');
            window.location.href = 'index.html';
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            receivedEvent = true;
            switch (data.type) {
                case 'sync-state': player.currentTime(data.state.currentTime); data.state.isPlaying ? player.play() : player.pause(); break;
                case 'play': if (player.paused()) player.play(); break;
                case 'pause': if (!player.paused()) player.pause(); break;
                case 'seek': player.currentTime(data.time); break;
            }
            setTimeout(() => receivedEvent = false, 250);
        };

        const sendEvent = (type, time) => { if (ws.readyState === WebSocket.OPEN && !receivedEvent) { ws.send(JSON.stringify({ type, roomCode, time })); } };
        player.on('play', () => sendEvent('play'));
        player.on('pause', () => sendEvent('pause'));
        player.on('seeked', () => sendEvent('seek', player.currentTime()));
        window.ws = ws; 
    }

    function setupPlayerControls(player) {
        micBtn.addEventListener('click', () => { if (typeof toggleMic === 'function') toggleMic(); });
        cameraBtn.addEventListener('click', () => { if (typeof toggleCamera === 'function') toggleCamera(); });
    }

    function setupButtonListeners() {
        exitButtonEl.addEventListener('click', async () => {
            if (typeof leaveChannel === 'function') await leaveChannel();
            if (window.ws) window.ws.close();
            window.location.href = 'index.html';
        });

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
});