// This file requires auth.js to be loaded first to access firebase and auth objects.

document.addEventListener('DOMContentLoaded', () => {
    const uploadContainer = document.getElementById('upload-container');
    const fileInput = document.getElementById('file-input');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const uploadStatus = document.getElementById('upload-status');
    const movieLibrary = document.getElementById('movie-library');
    const libraryLoadingMessage = document.getElementById('library-loading-message');
    
    const backendUrl = 'https://movienight-backend-veka.onrender.com';
    let currentUser = null;

    // --- Authentication Check ---
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadUserMovies(user.uid);
        } else {
            // If user is not logged in, they can't see their library
            libraryLoadingMessage.textContent = 'Please log in to see your movie library.';
        }
    });

    // --- Event Listeners for File Input ---
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFileUpload(file);
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
        if (file) handleFileUpload(file);
    });

    /**
     * Fetches and displays the user's previously uploaded movies.
     * @param {string} userId The UID of the logged-in user.
     */
    async function loadUserMovies(userId) {
        try {
            const response = await fetch(`${backendUrl}/api/movies/${userId}`);
            if (!response.ok) throw new Error('Could not fetch movies.');
            
            const movies = await response.json();
            libraryLoadingMessage.classList.add('hidden');
            movieLibrary.innerHTML = ''; // Clear the loading message

            if (movies.length === 0) {
                movieLibrary.innerHTML = '<p class="text-slate-400 text-center">You haven\'t uploaded any movies yet.</p>';
                return;
            }

            movies.forEach(movie => {
                const movieEl = document.createElement('div');
                movieEl.className = 'bg-slate-800 p-3 rounded-lg flex items-center justify-between';
                movieEl.innerHTML = `
                    <p class="truncate pr-4">${movie.fileName}</p>
                    <div class="flex-shrink-0 flex gap-2">
                        <button class="host-btn bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 text-sm rounded">Host</button>
                        <button class="delete-btn bg-red-600 hover:bg-red-500 text-white px-3 py-1 text-sm rounded">Delete</button>
                    </div>
                `;
                
                // Add event listeners for the new buttons
                movieEl.querySelector('.host-btn').onclick = () => createRoom(movie.publicUrl);
                movieEl.querySelector('.delete-btn').onclick = () => deleteMovie(movie._id, movie.filePath, movieEl);
                
                movieLibrary.appendChild(movieEl);
            });

        } catch (error) {
            console.error("Failed to load movie library:", error);
            libraryLoadingMessage.textContent = 'Could not load your movies.';
        }
    }

    /**
     * Deletes a movie from the database and storage.
     * @param {string} movieId The MongoDB ObjectId of the movie.
     * @param {string} filePath The path of the file in Firebase Storage.
     * @param {HTMLElement} movieElement The HTML element to remove from the UI.
     */
    async function deleteMovie(movieId, filePath, movieElement) {
        if (!currentUser) return alert("You must be logged in to delete movies.");
        if (!confirm("Are you sure you want to permanently delete this movie?")) return;

        try {
            const response = await fetch(`${backendUrl}/api/movies`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movieId, filePath, userId: currentUser.uid })
            });

            if (!response.ok) throw new Error('Failed to delete the movie on the server.');
            
            movieElement.remove(); // Remove from the UI on success
            alert("Movie deleted successfully.");

        } catch (error) {
            console.error("Failed to delete movie:", error);
            alert("Error: Could not delete the movie.");
        }
    }


    /**
     * Main function to handle the entire file upload process.
     */
    async function handleFileUpload(file) {
        if (!currentUser) return alert("You must be logged in to upload a movie.");
        if (file.type !== 'video/mp4') return alert('Please select a valid MP4 video file.');

        progressContainer.classList.remove('hidden');
        uploadStatus.textContent = 'Preparing to upload...';

        try {
            const response = await fetch(`${backendUrl}/api/generate-upload-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: file.name, fileType: file.type }),
            });

            if (!response.ok) throw new Error('Failed to get upload URL.');
            
            const { signedUrl, publicUrl, filePath } = await response.json();
            
            await uploadFile(signedUrl, file);
            
            await createRoom(publicUrl, file.name, filePath, currentUser.uid);

        } catch (error) {
            console.error('File upload process failed:', error);
            uploadStatus.textContent = `Error: ${error.message}`;
        }
    }

    /**
     * Uploads the file to the provided signed URL.
     */
    function uploadFile(url, file) {
        // ... (this function remains the same)
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', url, true);
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    progressBar.style.width = `${percent}%`;
                    progressBar.textContent = `${percent}%`;
                }
            };
            xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(xhr.statusText));
            xhr.onerror = () => reject(new Error('Network error during upload.'));
            xhr.send(file);
        });
    }

    /**
     * Creates a new room on the backend and redirects.
     */
    async function createRoom(publicUrl, fileName = null, filePath = null, userId = null) {
        uploadStatus.textContent = 'Finalizing room...';
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const body = { roomCode, fileId: publicUrl };
        if (fileName && filePath && userId) {
            body.fileName = fileName;
            body.filePath = filePath;
            body.userId = userId;
        }

        const response = await fetch(`${backendUrl}/api/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) throw new Error('Failed to create room on server.');
        
        uploadStatus.textContent = 'Success! Redirecting...';
        window.location.href = `watch.html?fileId=${encodeURIComponent(publicUrl)}&roomCode=${roomCode}`;
    }
});
