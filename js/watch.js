document.addEventListener('authReady', () => {
    const params = new URLSearchParams(window.location.search);
    const movieId = params.get('movieId');
    const roomCode = params.get('roomCode');

    const roomCodeTextEl = document.getElementById('room-code-text');
    const copyRoomCodeBtn = document.getElementById('copy-room-code-btn');
    const exitButtonEl = document.getElementById('exit-button');
    const micBtn = document.getElementById('mic-btn');
    const cameraBtn = document.getElementById('camera-btn');
    const loadingOverlay = document.getElementById('loading-overlay');

    let isHost = false; 

    if (!movieId || !roomCode) {
        alert('Missing room information. Redirecting...');
        window.location.href = 'index.html';
        return;
    }

    if (roomCodeTextEl) {
        roomCodeTextEl.textContent = roomCode;
    }
    
    const player = videojs('movie-player', { fluid: true, responsive: true });

    initializeAuthAndVideo(roomCode, player);
    setupButtonListeners();

    async function loadVideo(player, movieId, token) {
        try {
            const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3000' : 'https://movienight-backend-veka.onrender.com';
            const response = await fetch(`${backendUrl}/api/movies/${movieId}/stream-url`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
            const data = await response.json();
            player.src({ src: data.streamUrl, type: 'video/mp4' });
            player.ready(() => loadingOverlay.classList.add('hidden'));
        } catch (error) {
            console.error(`Error loading video: ${error.message}`);
            loadingOverlay.classList.add('hidden');
            alert('Failed to load the video. You may not have permission or the room is invalid.');
            window.location.href = 'index.html';
        }
    }

    function initializeAuthAndVideo(roomCode, player) {
        auth.onAuthStateChanged(async user => {
            if (user) {
                const token = await user.getIdToken();
                localStorage.setItem('firebaseIdToken', token);
                
                await loadVideo(player, movieId, token);

                const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3000' : 'https://movienight-backend-veka.onrender.com';
                const roomResponse = await fetch(`${backendUrl}/api/rooms/${roomCode}`);
                const roomData = await roomResponse.json();
                isHost = user.uid === roomData.hostId;
                
                if (!isHost) {
                    player.controls(false);
                }

                setupVideoSync(player, roomCode, token);

                const userName = user.displayName || user.email.split('@')[0];
                document.getElementById('local-user-name').textContent = userName;
                if (typeof joinAndDisplayLocalStream === 'function') {
                    joinAndDisplayLocalStream(roomCode, userName);
                }
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

        let wasPlayingBeforeSeek = false;
        let isProgrammaticChange = false;

        ws.onopen = () => console.log('WebSocket connection established.');
        ws.onerror = () => {
            alert('Could not connect to the session.');
            window.location.href = 'index.html';
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            isProgrammaticChange = true;

            try {
                let isPlaying, currentTime;
                if (data.type === 'sync-state') {
                    isPlaying = data.state.isPlaying;
                    currentTime = data.state.currentTime;
                } else if (data.type === 'sync') {
                    isPlaying = data.isPlaying;
                    currentTime = data.time;
                }

                switch (data.type) {
                    case 'sync-state':
                    case 'sync':
                        if (Math.abs(player.currentTime() - currentTime) > 1.5) {
                            player.currentTime(currentTime);
                        }
                        isPlaying ? player.play() : player.pause();
                        break;
                    case 'play':
                        player.play();
                        break;
                    case 'pause':
                        player.pause();
                        break;
                }
            } catch (e) { console.error("Error handling player state:", e); }

            setTimeout(() => { isProgrammaticChange = false; }, 500);
        };

        const sendEvent = (data) => {
            if (isHost && ws.readyState === WebSocket.OPEN && !isProgrammaticChange) {
                ws.send(JSON.stringify({ roomCode, ...data }));
            }
        };

        player.on('play', () => sendEvent({ type: 'play', time: player.currentTime() }));
        player.on('pause', () => {
            if (!player.seeking()) {
                sendEvent({ type: 'pause', time: player.currentTime() });
            }
        });

        player.on('seeking', () => {
            if (isHost && !isProgrammaticChange) {
                wasPlayingBeforeSeek = !player.paused();
                sendEvent({ type: 'pause', time: player.currentTime() });
            }
        });

        player.on('seeked', () => {
            if (isHost && !isProgrammaticChange) {
                const newTime = player.currentTime();
                sendEvent({ type: 'sync', time: newTime, isPlaying: false });
                
                if (wasPlayingBeforeSeek) {
                    setTimeout(() => {
                        sendEvent({ type: 'play', time: newTime });
                    }, 250); // Buffer time
                }
            }
        });
        
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
                setTimeout(() => { copyRoomCodeBtn.innerHTML = originalIcon; lucide.createIcons(); }, 2000);
            });
        }
    }
});