document.addEventListener('DOMContentLoaded', () => {
    const joinForm = document.getElementById('join-form');
    const roomCodeInput = document.getElementById('room-code-input');
    const errorMessage = document.getElementById('error-message');

    if (joinForm) {
        joinForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const enteredCode = roomCodeInput.value.toUpperCase();
            if (!enteredCode || enteredCode.length < 6) {
                showError('Please enter a valid 6-character room code.');
                return;
            }

            // Use your deployed Render URL here
            const backendUrl = 'https://movienight-backend-veka.onrender.com';

            fetch(`${backendUrl}/api/rooms/${enteredCode}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Room not found');
                }
                return response.json();
            })
            .then(data => {
                const fileId = data.fileId;
                console.log(`Room ${enteredCode} found with file ${fileId}. Joining...`);
                // The fileId URL must be encoded before being put in the redirect URL
                window.location.href = `watch.html?fileId=${encodeURIComponent(fileId)}&roomCode=${enteredCode}`;
            })
            .catch(error => {
                showError(`Room "${enteredCode}" not found. Please check the code and try again.`);
                console.error('Error finding room:', error);
            });
        });
    }

    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.classList.remove('hidden');
        }
    }
});
