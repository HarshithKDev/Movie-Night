document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    // The fileId is now a full URL, so it needs to be decoded
    const fileId = decodeURIComponent(params.get('fileId'));
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
    // Get the new <video> element with the correct ID
    const player = videojs('movie-player');
    
    // Set the source for the Video.js player
    player.src({ src: fileId });

    // --- Video Call Setup ---
    joinAndDisplayLocalStream(roomCode);

    // --- WebSocket Connection for Video Sync ---
    const wsUrl = 'wss://movienight-backend-veka.onrender.com'.replace(/^http/, 'ws');
    const ws = new WebSocket(wsUrl);
    
    // A flag to prevent echoing events back to the server
    let receivedEvent = false;

    ws.onopen = () => {
        console.log('Connected to WebSocket server.');
        ws.send(JSON.stringify({ type: 'join', roomCode }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received message:', data);

        // Set the flag to true so we know this action came from the server
        receivedEvent = true;

        switch (data.type) {
            case 'play':
                player.play();
                break;
            case 'pause':
                player.pause();
                break;
            case 'seek':
                // Set the player's time to the time sent by the server
                player.currentTime(data.time);
                break;
        }
        
        // Reset the flag shortly after, so user actions can be sent again
        setTimeout(() => { receivedEvent = false; }, 100);
    };

    ws.onclose = () => console.log('Disconnected from WebSocket server.');
    ws.onerror = (error) => console.error('WebSocket error:', error);

    // --- Sending Sync Events to the Server ---
    
    function sendPlaybackEvent(type, time = null) {
        if (ws.readyState === WebSocket.OPEN) {
            const message = { type, roomCode };
            if (time !== null) {
                message.time = time;
            }
            ws.send(JSON.stringify(message));
        }
    }
    
    // Listen for events on the player and send them to the server
    player.on('play', () => {
        if (receivedEvent) return; // Don't send an event we just received
        console.log('Sending play event');
        sendPlaybackEvent('play');
    });

    player.on('pause', () => {
        if (receivedEvent) return; // Don't send an event we just received
        console.log('Sending pause event');
        sendPlaybackEvent('pause');
    });

    player.on('seeked', () => {
        if (receivedEvent) return; // Don't send an event we just received
        const currentTime = player.currentTime();
        console.log(`Sending seek event to ${currentTime}`);
        sendPlaybackEvent('seek', currentTime);
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
