document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const fileId = params.get('fileId');
    const roomCode = params.get('roomCode');

    const roomCodeEl = document.getElementById('room-code');
    const videoPlayerEl = document.getElementById('video-player');
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
    videoPlayerEl.src = `https://drive.google.com/file/d/${fileId}/embed`;

    // --- Video Call Setup ---
    joinAndDisplayLocalStream(roomCode);

    // --- WebSocket Connection for Video Sync ---
    // Use your Render backend URL here. Replace 'movienight-backend.onrender.com' with your actual URL.
    // The URL must start with wss:// (for secure WebSocket)
    const wsUrl = 'wss://movienight-backend.onrender.com'.replace(/^http/, 'ws');
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('Connected to WebSocket server.');
        // When the connection is open, send a message to join the specific room
        ws.send(JSON.stringify({ type: 'join', roomCode }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received message from server:', data);

        // IMPORTANT LIMITATION NOTE:
        // The standard Google Drive embed (`/embed`) does NOT provide a JavaScript API
        // to control playback (play, pause, seek, get current time).
        // This means we can RECEIVE the events, but we cannot programmatically MAKE
        // the other users' videos play or pause in sync.
        // The console logs below demonstrate that the real-time communication is working.
        // A real-world app would require a different video player that allows for API control.

        switch (data.type) {
            case 'play':
                console.log("Received 'play' command. Manual control required by user.");
                break;
            case 'pause':
                console.log("Received 'pause' command. Manual control required by user.");
                break;
            case 'seek':
                console.log(`Received 'seek' command to ${data.time}. Manual control required.`);
                break;
        }
    };

    ws.onclose = () => {
        console.log('Disconnected from WebSocket server.');
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    // This function demonstrates how you would send playback events to the server.
    // Since we can't listen to the iframe's events, you would hook these up to custom UI buttons.
    function sendPlaybackEvent(type, time = null) {
        if (ws.readyState === WebSocket.OPEN) {
            const message = { type, roomCode };
            if (time !== null) {
                message.time = time;
            }
            ws.send(JSON.stringify(message));
            console.log(`Sent '${type}' event to server.`);
        }
    }
    
    // --- Button Event Listeners ---
    exitButtonEl.onclick = async () => {
        await leaveChannel();
        ws.close(); // Close the WebSocket connection when exiting
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
