document.addEventListener('DOMContentLoaded', () => {
    const uploadContainer = document.getElementById('upload-container');
    const fileInput = document.getElementById('file-input');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const uploadStatus = document.getElementById('upload-status');
    
    // Use your deployed Render URL here
    const backendUrl = 'https://movienight-backend.onrender.com';

    // --- Event Listeners for File Input ---
    
    // When the user selects a file
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });

    // Add drag and drop functionality
    uploadContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadContainer.classList.add('border-indigo-500');
    });
    uploadContainer.addEventListener('dragleave', () => {
        uploadContainer.classList.remove('border-indigo-500');
    });
    uploadContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadContainer.classList.remove('border-indigo-500');
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });

    /**
     * Main function to handle the entire file upload process.
     * @param {File} file The video file selected by the user.
     */
    async function handleFileUpload(file) {
        if (!file.type.startsWith('video/')) {
            alert('Please select a valid video file.');
            return;
        }

        progressContainer.classList.remove('hidden');
        uploadStatus.textContent = 'Preparing to upload...';

        try {
            // 1. Ask our backend for a secure, one-time upload URL
            uploadStatus.textContent = 'Requesting upload link from server...';
            const response = await fetch(`${backendUrl}/api/generate-upload-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: file.name, fileType: file.type }),
            });

            if (!response.ok) throw new Error('Failed to get upload URL from server.');
            
            const { signedUrl, publicUrl } = await response.json();
            console.log("Received signed URL for upload and public URL for playback.");

            // 2. Upload the file directly to Firebase Storage using the signed URL
            uploadStatus.textContent = 'Uploading file... (This may take a while)';
            await uploadFile(signedUrl, file);

            // 3. Create the room in our database with the permanent public URL
            uploadStatus.textContent = 'Finalizing room...';
            const roomCode = await createRoom(publicUrl);

            // 4. Redirect to the watch party page
            uploadStatus.textContent = 'Success! Redirecting to room...';
            window.location.href = `watch.html?fileId=${encodeURIComponent(publicUrl)}&roomCode=${roomCode}`;

        } catch (error) {
            console.error('File upload process failed:', error);
            uploadStatus.textContent = `Error: ${error.message}`;
            progressContainer.classList.add('hidden');
        }
    }

    /**
     * Uploads the file to the provided signed URL using a PUT request.
     * @param {string} url The signed URL from Firebase.
     * @param {File} file The file to upload.
     */
    function uploadFile(url, file) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', url, true);
            xhr.setRequestHeader('Content-Type', file.type);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    progressBar.style.width = `${percentComplete}%`;
                    progressBar.textContent = `${percentComplete}%`;
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(xhr.response);
                } else {
                    reject(new Error(`Upload failed with status: ${xhr.statusText}`));
                }
            };

            xhr.onerror = () => reject(new Error('Network error during upload.'));
            
            xhr.send(file);
        });
    }

    /**
     * Creates a new room on the backend.
     * @param {string} publicUrl The permanent public URL of the uploaded video.
     * @returns {Promise<string>} The generated room code.
     */
    async function createRoom(publicUrl) {
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const response = await fetch(`${backendUrl}/api/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomCode, fileId: publicUrl }),
        });

        if (!response.ok) throw new Error('Failed to create room on server.');
        
        const data = await response.json();
        return data.roomCode;
    }
});
