document.addEventListener('authReady', () => {
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

    function getAuthHeader() {
        const token = localStorage.getItem('firebaseIdToken');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadUserMovies();
        } else {
            movieLibrary.innerHTML = `<div class="p-8 text-center text-on-surface/60">Please log in to see your library.</div>`;
        }
    });

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
                controlsDiv.className = 'flex items-center gap-3';

                // Host Button (with responsive icon/text)
                const hostBtn = document.createElement('button');
                hostBtn.className = 'host-btn flex items-center justify-center p-2 sm:px-3 sm:py-1.5 text-sm font-semibold text-primary rounded-md hover:bg-primary/10';
                hostBtn.innerHTML = `
                    <i data-lucide="tv" class="w-4 h-4 sm:hidden"></i>
                    <span class="hidden sm:inline">Host</span>
                `;
                hostBtn.onclick = () => createRoom(movie.publicUrl, movie.fileName, movie.filePath);

                // Rename Button (with responsive icon/text)
                const renameBtn = document.createElement('button');
                renameBtn.className = 'rename-btn flex items-center justify-center p-2 sm:px-3 sm:py-1.5 text-sm font-semibold hover:bg-white/10 rounded-md';
                renameBtn.innerHTML = `
                    <i data-lucide="edit" class="w-4 h-4 sm:hidden"></i>
                    <span class="hidden sm:inline">Rename</span>
                `;
                renameBtn.onclick = () => openRenameModal(movie._id, movie.fileName, nameSpan);

                // Delete Button (with responsive icon/text)
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn flex items-center justify-center p-2 sm:px-3 sm:py-1.5 text-sm font-semibold text-error hover:bg-error/10 rounded-md';
                deleteBtn.innerHTML = `
                    <i data-lucide="trash-2" class="w-4 h-4 sm:hidden"></i>
                    <span class="hidden sm:inline">Delete</span>
                `;
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
            showNotification('Could not load your library. Please try again.', 'error');
            movieLibrary.innerHTML = `<div class="p-8 text-center text-error">Failed to load library. Please try again later.</div>`;
        }
    }

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
                throw new Error('Could not prepare the upload.');
            }
            const { signedUrl, publicUrl, filePath } = await response.json();
            await uploadFile(signedUrl, file);
            await createRoom(publicUrl, file.name, filePath);
        } catch (error) {
            console.error("File upload process failed:", error);
            uploadStatus.textContent = `Error: Upload failed.`;
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
            xhr.onload = () => (xhr.status === 200 ? resolve() : reject(new Error('Upload failed with status ' + xhr.status)));
            xhr.onerror = () => reject(new Error('Network error during upload.'));
            xhr.send(file);
        });
    }

    async function createRoom(publicUrl, fileName, filePath) {
        uploadStatus.textContent = 'Creating room...';
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        try {
            const response = await fetch(`${backendUrl}/api/rooms`, {
                method: 'POST',
                headers: getAuthHeader(),
                body: JSON.stringify({ roomCode, fileId: publicUrl, fileName, filePath }),
            });

            if (!response.ok) {
                throw new Error('Server responded with an error creating the room.');
            }

            const newRoom = await response.json();
            const movieId = newRoom.movieId;

            uploadStatus.textContent = 'Success! Redirecting...';
            setTimeout(() => {
                window.location.href = `html/watch.html?movieId=${movieId}&roomCode=${roomCode}`;
            }, 1500);
        } catch (error) {
            console.error("Failed to create room:", error);
            showNotification('Failed to create room. Please try again.', 'error');
            uploadStatus.textContent = 'Failed to create room.';
        }
    }

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