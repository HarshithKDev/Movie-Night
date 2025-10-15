document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const uploadContainer = document.getElementById('upload-container');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const uploadStatus = document.getElementById('upload-status');
    const movieLibrary = document.getElementById('movie-library');
    const libraryLoadingMessage = document.getElementById('library-loading-message');

    const renameModal = document.getElementById('rename-modal');
    const renameInput = document.getElementById('rename-input');
    const saveRenameBtn = document.getElementById('save-rename-btn');
    const cancelRenameBtn = document.getElementById('cancel-rename-btn');

    const deleteModal = document.getElementById('delete-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

    const backendUrl = 'https://movienight-backend-veka.onrender.com';
    let currentUser = null;

    // --- Authentication and Movie Loading ---
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadUserMovies(user.uid);
        } else {
            movieLibrary.innerHTML = `<div class="p-8 text-center text-on-surface/60">Please log in to see your library.</div>`;
        }
    });

    // --- File Upload Listeners ---
    fileInput.addEventListener('change', (e) => handleFileUpload(e.target.files[0]));
    uploadContainer.addEventListener('dragover', (e) => { e.preventDefault(); });
    uploadContainer.addEventListener('drop', (e) => { e.preventDefault(); handleFileUpload(e.dataTransfer.files[0]); });

    // --- Core Functions ---
    async function loadUserMovies(userId) {
        try {
            const response = await fetch(`${backendUrl}/api/movies/${userId}`);
            if (!response.ok) throw new Error('Could not fetch movies.');
            
            const movies = await response.json();
            movieLibrary.innerHTML = ''; 

            if (movies.length === 0) {
                movieLibrary.innerHTML = `<div class="text-center p-8 text-on-surface/60"><p>Your movie library is empty.</p></div>`;
                return;
            }

            movies.forEach(movie => {
                const movieEl = document.createElement('div');
                movieEl.className = 'flex items-center p-4 group hover:bg-white/5';
                movieEl.innerHTML = `
                    <i data-lucide="film" class="w-5 h-5 mr-4 text-on-surface/60"></i>
                    <span class="flex-1 truncate">${movie.fileName}</span>
                    <div class="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <button class="host-btn px-3 py-1.5 text-sm font-semibold bg-primary text-on-primary rounded-md hover:bg-opacity-90">Host</button>
                        <button class="rename-btn px-3 py-1.5 text-sm font-semibold hover:bg-white/10 rounded-md">Rename</button>
                        <button class="delete-btn px-3 py-1.5 text-sm font-semibold text-error hover:bg-error/10 rounded-md">Delete</button>
                    </div>
                `;
                movieEl.querySelector('.host-btn').onclick = () => createRoom(movie.publicUrl);
                movieEl.querySelector('.rename-btn').onclick = () => openRenameModal(movie._id, movie.fileName, movieEl);
                movieEl.querySelector('.delete-btn').onclick = () => openDeleteModal(movie._id, movie.filePath, movieEl);
                movieLibrary.appendChild(movieEl);
            });
            lucide.createIcons(); // Re-render icons
        } catch (error) {
            showNotification('Could not load your movies.', 'error');
            movieLibrary.innerHTML = `<div class="p-8 text-center text-error">Failed to load library.</div>`;
        }
    }

    // --- Modal Logic ---
    function openRenameModal(movieId, currentName, movieElement) {
        renameInput.value = currentName;
        renameModal.classList.remove('hidden');
        renameModal.classList.add('flex');

        saveRenameBtn.onclick = async () => {
            const newName = renameInput.value.trim();
            if (newName && newName !== currentName) {
                try {
                    await fetch(`${backendUrl}/api/movies/${movieId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ newName, userId: currentUser.uid })
                    });
                    movieElement.querySelector('span').textContent = newName;
                    showNotification("Movie renamed successfully!", "success");
                } catch (error) {
                    showNotification("Could not rename the movie.", "error");
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
                await fetch(`${backendUrl}/api/movies`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ movieId, filePath, userId: currentUser.uid })
                });
                movieElement.remove();
                showNotification("Movie deleted successfully.", "success");
            } catch (error) {
                showNotification("Could not delete the movie.", "error");
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: file.name, fileType: file.type }),
            });
            const { signedUrl, publicUrl, filePath } = await response.json();
            
            await uploadFile(signedUrl, file);
            await createRoom(publicUrl, file.name, filePath, currentUser.uid);

        } catch (error) {
            uploadStatus.textContent = `Error: ${error.message}`;
            showNotification(`Upload failed: ${error.message}`, "error");
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

    async function createRoom(publicUrl, fileName = null, filePath = null, userId = null) {
        uploadStatus.textContent = 'Creating room...';
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        try {
            await fetch(`${backendUrl}/api/rooms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomCode, fileId: publicUrl, fileName, filePath, userId }),
            });
            
            uploadStatus.textContent = 'Success! Redirecting...';
            setTimeout(() => {
                window.location.href = `watch.html?fileId=${encodeURIComponent(publicUrl)}&roomCode=${roomCode}`;
            }, 1500);
            
        } catch (error) {
            showNotification('Failed to create room.', 'error');
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
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('animate-fade-out-down');
            toast.addEventListener('animationend', () => toast.remove());
        }, 3000);
    }

    // Add animation keyframes if they don't exist
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