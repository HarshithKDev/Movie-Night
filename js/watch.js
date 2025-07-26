document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const fileId = decodeURIComponent(params.get('fileId'));
    const roomCode = params.get('roomCode');

    // --- DOM Elements ---
    const roomCodeEl = document.getElementById('room-code');
    const exitButtonEl = document.getElementById('exit-button');
    const copyButtonEl = document.getElementById('copy-button');
    const micBtn = document.getElementById('mic-btn');
    const cameraBtn = document.getElementById('camera-btn');
    const unmuteOverlay = document.getElementById('unmute-overlay');

    if (!fileId || !roomCode) {
        alert('Error: Missing file or room information.');
        window.location.href = 'index.html';
        return;
    }

    roomCodeEl.textContent = roomCode;
    const player = videojs('movie-player');

    // --- Fetch Secure Video URL ---
    try {
        const backendUrl = 'https://movienight-backend-veka.onrender.com';
        const response = await fetch(`${backendUrl}/api/get-stream-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicUrl: fileId }),
        });
        if (!response.ok) throw new Error('Failed to get streamable URL.');
        const data = await response.json();
        player.src({ src: data.streamUrl });
    } catch (error) {
        console.error("❌ Failed to load video:", error);
        const playerWrapper = document.getElementById('video-js-wrapper');
        if(playerWrapper) playerWrapper.innerHTML = `<div class="w-full h-full flex items-center justify-center text-red-500 p-4"><p>Error: Could not load video.</p></div>`;
    }

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
        console.log('Received message from server:', data);
        receivedEvent = true;

        switch (data.type) {
            case 'sync-state':
                const { isPlaying, currentTime } = data.state;
                player.currentTime(currentTime);
                if (isPlaying) {
                    player.play();
                } else {
                    player.pause();
                }
                break;
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
        setTimeout(() => { receivedEvent = false; }, 250);
    };

    player.on('loadedmetadata', () => {
        const audioTracks = player.audioTracks();
        if (audioTracks.length > 0) {
            console.log(`✅ SUCCESS: Found ${audioTracks.length} audio track(s).`);
        } else {
            console.error("❌ ERROR: No compatible audio tracks were found.");
        }
    });

    unmuteOverlay.addEventListener('click', () => {
        console.log('Unmute overlay clicked. Forcing unmute and volume.');
        player.muted(false);
        player.volume(1.0);
        player.play();
        unmuteOverlay.style.display = 'none';
    }, { once: true });

    function sendPlaybackEvent(type, time = null) {
        if (ws.readyState === WebSocket.OPEN && !receivedEvent) {
            const message = { type, roomCode };
            if (time !== null) message.time = time;
            ws.send(JSON.stringify(message));
        }
    }
    
    player.on('play', () => sendPlaybackEvent('play'));
    player.on('pause', () => sendPlaybackEvent('pause'));
    player.on('seeked', () => sendPlaybackEvent('seek', player.currentTime()));

    // --- Button Event Listeners ---
    exitButtonEl.onclick = async () => {
        await leaveChannel();
        ws.close();
        window.location.href = 'index.html';
    };
    
    // --- ✅ THIS IS THE FIX ---
    // The button now copies only the roomCode to the clipboard.
    copyButtonEl.onclick = () => {
        navigator.clipboard.writeText(roomCode).then(() => {
            copyButtonEl.textContent = 'Copied!';
            setTimeout(() => { copyButtonEl.textContent = 'Copy'; }, 2000);
        }).catch(err => {
            console.error('Failed to copy room code: ', err);
            alert('Failed to copy room code.');
        });
    };
    
    micBtn.addEventListener('click', toggleMic);
    cameraBtn.addEventListener('click', toggleCamera);
});
