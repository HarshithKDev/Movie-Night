document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const fileId = params.get('fileId');
    const roomCode = params.get('roomCode');

    const roomCodeEl = document.getElementById('room-code');
    const videoPlayerEl = document.getElementById('video-player');
    const exitButtonEl = document.getElementById('exit-button');
    const copyButtonEl = document.getElementById('copy-button');
    // --- NEW: Get the new control buttons ---
    const micBtn = document.getElementById('mic-btn');
    const cameraBtn = document.getElementById('camera-btn');

    // Check if the necessary parameters are in the URL
    if (!fileId || !roomCode) {
        alert('Error: Missing file or room information. Redirecting to home.');
        window.location.href = 'index.html'; // Assuming your main page is index.html
        return;
    }

    // --- Update the UI with the room and video info ---

    // Display the room code
    if (roomCodeEl) {
        roomCodeEl.textContent = roomCode;
    }

    // Set the video player source to the Google Drive embed URL
    if (videoPlayerEl) {
        videoPlayerEl.src = `https://docs.google.com/file/d/${fileId}/preview`;
    }

    // --- Initialize and join the video call automatically ---
    joinAndDisplayLocalStream(roomCode);


    // --- Add functionality to buttons ---

    // Handle exit button click
    if (exitButtonEl) {
        exitButtonEl.onclick = async () => {
            // Leave the video channel before redirecting
            await leaveChannel();
            window.location.href = 'index.html';
        };
    }
    
    // Handle copy button click
    if (copyButtonEl) {
        copyButtonEl.onclick = () => {
            const inviteLink = window.location.href; // The full URL can be shared
            
            // Use the Clipboard API to copy the link
            navigator.clipboard.writeText(inviteLink).then(() => {
                // Provide feedback to the user
                copyButtonEl.textContent = 'Copied!';
                setTimeout(() => {
                    copyButtonEl.textContent = 'Copy';
                }, 2000); // Reset button text after 2 seconds
            }).catch(err => {
                console.error('Failed to copy link: ', err);
                alert('Failed to copy link.');
            });
        };
    }

    // --- NEW: Add event listeners for media controls ---
    if(micBtn) {
        micBtn.addEventListener('click', toggleMic);
    }
    if(cameraBtn) {
        cameraBtn.addEventListener('click', toggleCamera);
    }
});
