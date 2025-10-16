// ---> NEW: Listen for the 'authReady' event from auth.js <---
document.addEventListener('authReady', () => {
    // All of the original code now goes inside this listener
    const fileInput = document.getElementById('file-input');
    const uploadContainer = document.getElementById('upload-container');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const uploadStatus = document.getElementById('upload-status');
    const movieLibrary = document.getElementById('movie-library');

    const renameModal = document.getElementById('rename-modal');
    const renameInput = document.getElementById('rename-input');
    const saveRenameBtn = document.getElementById('save-rename-btn');
    const cancelRenameBtn = document.getElementById('cancel-rename-btn');

    const deleteModal = document.getElementById('delete-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

    const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : 'https://movienight-backend-veka.onrender.com';
    let currentUser = null;

    // --- Helper function to create authorization headers ---
    function getAuthHeader() {
        const token = localStorage.getItem('firebaseIdToken');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    // --- Authentication and Movie Loading ---
    // This will now work because 'auth' is guaranteed to be initialized
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadUserMovies();
        } else {
            // If the user logs out, clear the library and show the login message.
            movieLibrary.innerHTML = `<div class="p-8 text-center text-on-surface/60">Please log in to see your library.</div>`;
        }
    });

    // --- File Upload Listeners ---
    fileInput.addEventListener('change', (e) => handleFileUpload(e.target.files[0]));
    uploadContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadContainer.classList.add('bg-primary/10');
    });
    uploadContainer.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadContainer.classList.remove('bg-primary/10');
    });
    uploadContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadContainer.classList.remove('bg-primary/10');
        const files = e.dataTransfer.files;
        if (files.length) {
            handleFileUpload(files[0]);
        }
    });


    // --- Core Functions ---
    async function loadUserMovies() {
        try {
            const token = await currentUser.getIdToken();
            const response = await fetch(`${backendUrl}/api/movies`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Could not fetch movies.');
            }
            
            const movies = await response.json();
            movieLibrary.innerHTML = ''; 

            if (movies.length === 0) {
                movieLibrary.innerHTML = `<div class="text-center p-8 text-on-surface/60"><p>Your movie library is empty. Upload a movie to get started!</p></div>`;
                return;
            }

            movies.forEach(movie => {
                const movieEl = document.createElement('div');
                movieEl.className = 'flex items-center p-4 hover:bg-white/5';
                const icon = document.createElement('i');
                icon.setAttribute('data-lucide', 'film');
                icon.className = 'w-5 h-5 mr-4 text-on-surface/60';
                const nameSpan = document.createElement('span');
                nameSpan.className = 'flex-1 truncate';
                nameSpan.textContent = movie.fileName;
                const controlsDiv = document.createElement('div');
                controlsDiv.className = 'flex gap-2';

                const hostBtn = document.createElement('button');
                hostBtn.className = 'host-btn px-3 py-1.5 text-sm font-semibold bg-primary text-on-primary rounded-md hover:bg-opacity-90';
                hostBtn.textContent = 'Host';
                hostBtn.onclick = () => createRoom(movie.publicUrl, movie.fileName, movie.filePath);

                const renameBtn = document.createElement('button');
                renameBtn.className = 'rename-btn px-3 py-1.5 text-sm font-semibold hover:bg-white/10 rounded-md';
                renameBtn.textContent = 'Rename';
                renameBtn.onclick = () => openRenameModal(movie._id, movie.fileName, nameSpan);

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn px-3 py-1.5 text-sm font-semibold text-error hover:bg-error/10 rounded-md';
                deleteBtn.textContent = 'Delete';
                deleteBtn.onclick = () => openDeleteModal(movie._id, movie.filePath, movieEl);

                controlsDiv.appendChild(hostBtn);
                controlsDiv.appendChild(renameBtn);
                controlsDiv.appendChild(deleteBtn);

                movieEl.appendChild(icon);
                movieEl.appendChild(nameSpan);
                movieEl.appendChild(controlsDiv);
                movieLibrary.appendChild(movieEl);
            });
            lucide.createIcons();
        } catch (error) {
            console.error("Failed to load movies:", error);
            // SECURITY FIX: Use a generic error message for the user.
            showNotification('Could not load your library. Please try again.', 'error');
            movieLibrary.innerHTML = `<div class="p-8 text-center text-error">Failed to load library. Please try again later.</div>`;
        }
    }

    // --- Modal Logic ---
    function openRenameModal(movieId, currentName, nameSpanElement) {
        renameInput.value = currentName;
        renameModal.classList.remove('hidden');
        renameModal.classList.add('flex');

        saveRenameBtn.onclick = async () => {
            const newName = renameInput.value.trim();
            if (newName && newName !== currentName) {
                try {
                    const response = await fetch(`${backendUrl}/api/movies/${movieId}`, {
                        method: 'PUT',
                        headers: getAuthHeader(),
                        body: JSON.stringify({ newName })
                    });
                    if (!response.ok) throw new Error('Failed to rename on server.');
                    nameSpanElement.textContent = newName;
                    showNotification("Movie renamed successfully!", "success");
                } catch (error) {
                    // SECURITY FIX: Use a generic error message for the user.
                    showNotification("An error occurred. Please try again.", "error");
                }
            }
            closeModal(renameModal);
        };
        cancelRenameBtn.onclick = () => closeModal(renameModal);
    }

    function openDeleteModal(movieId, filePath, movieElement) {
        deleteModal.classList.remove('hidden');
        deleteModal.classList.add('flex');
    
        confirmDeleteBtn.onclick = async () => {
            try {
                const response = await fetch(`${backendUrl}/api/movies/${movieId}`, {
                    method: 'DELETE',
                    headers: getAuthHeader(),
                });
                if (!response.ok) throw new Error('Failed to delete on server.');
                movieElement.remove();
                if (movieLibrary.children.length === 0) {
                    movieLibrary.innerHTML = `<div class="text-center p-8 text-on-surface/60"><p>Your movie library is empty. Upload a movie to get started!</p></div>`;
                }
                showNotification("Movie deleted successfully.", "success");
            } catch (error) {
                // SECURITY FIX: Use a generic error message for the user.
                showNotification("An error occurred. Please try again.", "error");
            }
            closeModal(deleteModal);
        };
        cancelDeleteBtn.onclick = () => closeModal(deleteModal);
    }

    function closeModal(modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    // --- Upload and Room Creation ---
    async function handleFileUpload(file) {
        if (!file || file.type !== 'video/mp4') {
            showNotification('Please select a valid MP4 video file.', 'error');
            return;
        }

        progressContainer.classList.remove('hidden');
        uploadStatus.textContent = 'Preparing upload...';
        progressBar.style.width = '0%';
        progressText.textContent = '0%';

        try {
            const response = await fetch(`${backendUrl}/api/generate-upload-url`, {
                method: 'POST',
                headers: getAuthHeader(),
                body: JSON.stringify({ fileName: file.name, fileType: file.type }),
            });
            if (!response.ok) {
                // SECURITY FIX: Use a generic error message
                throw new Error('Could not prepare the upload.');
            }
            const { signedUrl, publicUrl, filePath } = await response.json();
            await uploadFile(signedUrl, file);
            await createRoom(publicUrl, file.name, filePath);
        } catch (error) {
            uploadStatus.textContent = `Error: ${error.message}`;
            // SECURITY FIX: Use a generic error message
            showNotification("Upload failed. Please try again.", "error");
        }
    }

    function uploadFile(url, file) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', url, true);
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    progressBar.style.width = `${percent}%`;
                    progressText.textContent = `${percent}%`;
                    uploadStatus.textContent = `Uploading...`;
                }
            };
            xhr.onload = () => (xhr.status === 200 ? resolve() : reject(new Error('Upload failed')));
            xhr.onerror = () => reject(new Error('Network error during upload.'));
            xhr.send(file);
        });
    }

    async function createRoom(publicUrl, fileName, filePath) {
        uploadStatus.textContent = 'Creating room...';
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        try {
            await fetch(`${backendUrl}/api/rooms`, {
                method: 'POST',
                headers: getAuthHeader(),
                body: JSON.stringify({ roomCode, fileId: publicUrl, fileName, filePath }),
            });
            uploadStatus.textContent = 'Success! Redirecting...';
            setTimeout(() => {
                window.location.href = `watch.html?fileId=${encodeURIComponent(publicUrl)}&roomCode=${roomCode}`;
            }, 1500);
        } catch (error) {
            // SECURITY FIX: Use a generic error message
            showNotification('Failed to create room. Please try again.', 'error');
            uploadStatus.textContent = 'Failed to create room.';
        }
    }

    // --- Notification Toast ---
    function showNotification(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const colors = {
            success: 'bg-secondary text-black',
            error: 'bg-error text-on-primary',
            info: 'bg-surface text-on-surface',
        };
        const toast = document.createElement('div');
        toast.className = `px-4 py-3 rounded-md shadow-lg text-sm font-semibold animate-fade-in-up ${colors[type]}`;
        const textNode = document.createTextNode(message);
        toast.appendChild(textNode);
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('animate-fade-out-down');
            toast.addEventListener('animationend', () => toast.remove());
        }, 3000);
    }

    // Add animation keyframes
    if (!document.getElementById('toast-animations')) {
        const style = document.createElement('style');
        style.id = 'toast-animations';
        style.innerHTML = `
            @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
            @keyframes fade-out-down { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(10px); } }
            .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
            .animate-fade-out-down { animation: fade-out-down 0.3s ease-in forwards; }
        `;
        document.head.appendChild(style);
    }
});