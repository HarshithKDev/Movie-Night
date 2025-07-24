document.addEventListener('DOMContentLoaded', () => {
    const uploadContainer = document.getElementById('upload-container');
    const fileInput = document.getElementById('file-input');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const uploadStatus = document.getElementById('upload-status');
    
    // ✅ THIS IS THE DEFINITIVE FIX: Using your live Render URL
    const backendUrl = 'https://movienight-backend-veka.onrender.com';

    // --- Event Listeners for File Input ---
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });

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
        const acceptedExtensions = ['.mp4', '.mov', '.webm', '.mkv'];
        const fileExtension = `.${file.name.split('.').pop().toLowerCase()}`;
        
        if (!file.type.startsWith('video/') && !acceptedExtensions.includes(fileExtension)) {
            alert('Please select a valid video file (e.g., MP4, MOV, WEBM, MKV).');
            return;
        }

        progressContainer.classList.remove('hidden');
        uploadStatus.textContent = 'Requesting upload link from server...';

        try {
            const response = await fetch(`${backendUrl}/api/generate-upload-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: file.name, fileType: file.type || 'video/x-matroska' }),
            });

            if (!response.ok) throw new Error('Failed to get upload URL from server.');
            
            const { signedUrl, publicUrl } = await response.json();
            console.log("Received signed URL for upload and public URL for playback.");

            uploadStatus.textContent = 'Uploading file... (This may take a while)';
            await uploadFile(signedUrl, file);

            uploadStatus.textContent = 'Finalizing room...';
            const roomCode = await createRoom(publicUrl);

            uploadStatus.textContent = 'Success! Redirecting to room...';
            window.location.href = `watch.html?fileId=${encodeURIComponent(publicUrl)}&roomCode=${roomCode}`;

        } catch (error) {
            console.error('File upload process failed:', error);
            uploadStatus.textContent = `Error: ${error.message}`;
            progressContainer.classList.add('hidden');
        }
    }

    function uploadFile(url, file) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', url, true);
            xhr.setRequestHeader('Content-Type', file.type || 'video/x-matroska');

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
