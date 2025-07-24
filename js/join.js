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

            // --- NEW: Look up the room code from your backend ---
            fetch(` https://1fa63c5e0cb7.ngrok-free.app/api/rooms/${enteredCode}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Room not found');
                }
                return response.json();
            })
            .then(data => {
                const fileId = data.fileId;
                console.log(`Room ${enteredCode} found with file ${fileId}. Joining...`);
                window.location.href = `watch.html?fileId=${fileId}&roomCode=${enteredCode}`;
            })
            .catch(error => {
                showError(`Room "${enteredCode}" not found. Please check the code and try again.`);
                console.error('Error finding room:', error);
            });
            // --- END NEW ---
        });
    }

    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.classList.remove('hidden');
        }
    }
});