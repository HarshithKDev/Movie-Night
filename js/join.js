document.addEventListener('DOMContentLoaded', () => {
    const joinForm = document.getElementById('join-form');
    const roomCodeInput = document.getElementById('room-code-input');
    const errorText = document.getElementById('error-text');
    const loadingOverlay = document.getElementById('loading-overlay');

    joinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const enteredCode = roomCodeInput.value.toUpperCase().trim();

        if (!enteredCode || enteredCode.length < 6) {
            showError('Please enter a valid 6-character room code.');
            return;
        }

        hideError();
        showLoading(true);

        try {
           const backendUrl = 'http://localhost:3000'; 
            const response = await fetch(`${backendUrl}/api/rooms/${enteredCode}`);
            if (!response.ok) throw new Error('Room not found');
            
            const data = await response.json();
            window.location.href = `watch.html?fileId=${encodeURIComponent(data.fileId)}&roomCode=${enteredCode}`;
        } catch (error) {
            showLoading(false);
            showError(`Room "${enteredCode}" not found. Please check the code.`);
        }
    });

    roomCodeInput.addEventListener('input', () => {
        hideError();
        roomCodeInput.value = roomCodeInput.value.toUpperCase();
    });

    function showError(message) {
        errorText.textContent = message;
    }
    function hideError() {
        errorText.textContent = '';
    }
    function showLoading(isLoading) {
        loadingOverlay.classList.toggle('hidden', !isLoading);
        loadingOverlay.classList.toggle('flex', isLoading);
    }
});