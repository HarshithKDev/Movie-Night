document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const fileId = decodeURIComponent(params.get('fileId')); // This is the publicUrl
    const roomCode = params.get('roomCode');

    const roomCodeEl = document.getElementById('room-code');
    const exitButtonEl = document.getElementById('exit-button');
    const copyButtonEl = document.getElementById('copy-button');
    const micBtn = document.getElementById('mic-btn');
    const cameraBtn = document.getElementById('camera-btn');

    if (!fileId || !roomCode) {
        alert('Error: Missing file or room information.');
        window.location.href = 'index.html';
        return;
    }

    // --- UI Setup ---
    roomCodeEl.textContent = roomCode;

    // --- Video.js Player Initialization ---
    const player = videojs('movie-player');
    
    // --- ✅ NEW: Fetch the secure, streamable URL from the backend ---
    try {
        const backendUrl = 'https://movienight-backend-veka.onrender.com';
        const response = await fetch(`${backendUrl}/api/get-stream-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicUrl: fileId }),
        });

        if (!response.ok) {
            throw new Error('Failed to get streamable URL from server.');
        }

        const data = await response.json();
        const streamUrl = data.streamUrl;

        // Set the source for the Video.js player with the new signed URL
        player.src({ src: streamUrl });
        console.log("✅ Player source set to signed stream URL.");

    } catch (error) {
        console.error("❌ Failed to load video:", error);
        const playerWrapper = document.getElementById('video-js-wrapper');
        if(playerWrapper) {
            playerWrapper.innerHTML = `<div class="w-full h-full flex items-center justify-center text-red-500 p-4"><p class="text-center">Error: Could not load video. The file may be private or has been deleted.</p></div>`;
        }
    }
    // --- END NEW ---

    // --- Video Call Setup ---
    joinAndDisplayLocalStream(roomCode);

    // --- WebSocket Connection for Video Sync ---
    const wsUrl = 'wss://movienight-backend-veka.onrender.com'.replace(/^http/, 'ws');
    const ws = new WebSocket(wsUrl);
    
    let receivedEvent = false;

    ws.onopen = () => {
        console.log('Connected to WebSocket server.');
        ws.send(JSON.stringify({ type: 'join', roomCode }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received message:', data);
        receivedEvent = true;
        switch (data.type) {
            case 'play':
                player.play();
                break;
            case 'pause':
                player.pause();
                break;
            case 'seek':
                player.currentTime(data.time);
                break;
        }
        setTimeout(() => { receivedEvent = false; }, 100);
    };

    ws.onclose = () => console.log('Disconnected from WebSocket server.');
    ws.onerror = (error) => console.error('WebSocket error:', error);

    function sendPlaybackEvent(type, time = null) {
        if (ws.readyState === WebSocket.OPEN) {
            const message = { type, roomCode };
            if (time !== null) {
                message.time = time;
            }
            ws.send(JSON.stringify(message));
        }
    }
    
    player.on('play', () => {
        if (receivedEvent) return;
        sendPlaybackEvent('play');
    });

    player.on('pause', () => {
        if (receivedEvent) return;
        sendPlaybackEvent('pause');
    });

    player.on('seeked', () => {
        if (receivedEvent) return;
        sendPlaybackEvent('seek', player.currentTime());
    });

    // --- Button Event Listeners ---
    exitButtonEl.onclick = async () => {
        await leaveChannel();
        ws.close();
        window.location.href = 'index.html';
    };
    
    copyButtonEl.onclick = () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            copyButtonEl.textContent = 'Copied!';
            setTimeout(() => { copyButtonEl.textContent = 'Copy'; }, 2000);
        });
    };

    micBtn.addEventListener('click', toggleMic);
    cameraBtn.addEventListener('click', toggleCamera);
});
