// Enhanced host.js with cinematic animations and improved UX
// This file requires auth.js to be loaded first to access firebase and auth objects.

document.addEventListener('DOMContentLoaded', () => {
    // Initialize background animation
    initializeBackgroundAnimation();
    
    // Get DOM elements
    const uploadContainer = document.getElementById('upload-container');
    const fileInput = document.getElementById('file-input');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const uploadStatus = document.getElementById('upload-status');
    const movieLibrary = document.getElementById('movie-library');
    const libraryLoadingMessage = document.getElementById('library-loading-message');
    
    // Rename Modal elements
    const renameModal = document.getElementById('rename-modal');
    const renameInput = document.getElementById('rename-input');
    const saveRenameBtn = document.getElementById('save-rename-btn');
    const cancelRenameBtn = document.getElementById('cancel-rename-btn');

    // ✅ NEW: Delete Modal elements
    const deleteModal = document.getElementById('delete-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

    const backendUrl = 'https://movienight-backend-veka.onrender.com';
    let currentUser = null;

    // --- Authentication Check ---
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadUserMovies(user.uid);
        } else {
            libraryLoadingMessage.innerHTML = `
                <div class="text-center py-12">
                    <div class="text-4xl mb-4">🔒</div>
                    <p class="text-slate-400">Please log in to see your movie library</p>
                    <a href="index.html" class="inline-block mt-4 text-indigo-400 hover:text-indigo-300 transition-colors">
                        Go to Login
                    </a>
                </div>
            `;
        }
    });

    // --- Enhanced File Input Event Listeners ---
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFileUpload(file);
    });

    uploadContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadContainer.classList.add('drag-over');
    });

    uploadContainer.addEventListener('dragleave', (e) => {
        e.preventDefault();
        if (!uploadContainer.contains(e.relatedTarget)) {
            uploadContainer.classList.remove('drag-over');
        }
    });

    uploadContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadContainer.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    });

    function initializeBackgroundAnimation() {
        const iconContainer = document.getElementById('icon-background');
        if (!iconContainer) return;
        const icons = ['🎬', '🍿', '🎥', '🎞️', '🎟️', '🎭', '⭐', '📽️', '🌟', '✨', '💫', '🔥', '💎', '🏆', '🎊', '🎉'];
        for (let i = 0; i < 40; i++) createFloatingIcon(iconContainer, icons);
        setInterval(() => {
            createFloatingIcon(iconContainer, icons);
            cleanupIcons(iconContainer);
        }, 2000);
    }

    function createFloatingIcon(container, icons) {
        const icon = document.createElement('span');
        icon.classList.add('moving-icon');
        icon.innerText = icons[Math.floor(Math.random() * icons.length)];
        const size = Math.random() * 2.5 + 1.2;
        const left = Math.random() * 100;
        const duration = Math.random() * 15 + 25;
        const delay = Math.random() * -8;
        icon.style.fontSize = `${size}rem`;
        icon.style.left = `${left}vw`;
        icon.style.animationDuration = `${duration}s`;
        icon.style.animationDelay = `${delay}s`;
        icon.style.bottom = `-${size}rem`;
        icon.dataset.created = Date.now();
        container.appendChild(icon);
    }

    function cleanupIcons(container) {
        const icons = container.querySelectorAll('.moving-icon');
        const now = Date.now();
        icons.forEach(icon => {
            if (now - parseInt(icon.dataset.created) > 35000) {
                icon.remove();
            }
        });
    }

    async function loadUserMovies(userId) {
        try {
            const response = await fetch(`${backendUrl}/api/movies/${userId}`);
            if (!response.ok) throw new Error('Could not fetch movies.');
            
            const movies = await response.json();
            libraryLoadingMessage.classList.add('hidden');
            movieLibrary.innerHTML = '';

            if (movies.length === 0) {
                movieLibrary.innerHTML = `
                    <div class="text-center py-12">
                        <div class="text-6xl mb-4">📁</div>
                        <p class="text-slate-400 text-xl mb-2">Your library is empty</p>
                        <p class="text-slate-500">Upload your first movie to get started!</p>
                    </div>
                `;
                return;
            }

            movies.forEach((movie, index) => {
                const movieEl = document.createElement('div');
                movieEl.className = 'movie-card rounded-xl p-6 flex items-center justify-between hover-lift';
                movieEl.style.animationDelay = `${index * 0.1}s`;
                
                movieEl.innerHTML = `
                    <div class="flex items-center flex-1 min-w-0">
                        <div class="text-3xl mr-4">🎬</div>
                        <div class="flex-1 min-w-0">
                            <p class="movie-name text-white font-semibold text-lg truncate pr-4">${movie.fileName}</p>
                            <p class="text-slate-400 text-sm mt-1">Ready to watch</p>
                        </div>
                    </div>
                    <div class="flex-shrink-0 flex gap-3">
                        <button class="host-btn action-btn bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2 text-sm font-semibold rounded-lg">
                            Host
                        </button>
                        <button class="rename-btn action-btn bg-slate-600/50 hover:bg-slate-500/50 text-white px-4 py-2 text-sm font-semibold rounded-lg">
                            Rename
                        </button>
                        <button class="delete-btn action-btn bg-red-600/80 hover:bg-red-500/80 text-white px-4 py-2 text-sm font-semibold rounded-lg">
                            Delete
                        </button>
                    </div>
                `;
                
                const hostBtn = movieEl.querySelector('.host-btn');
                const renameBtn = movieEl.querySelector('.rename-btn');
                const deleteBtn = movieEl.querySelector('.delete-btn');
                
                hostBtn.onclick = () => {
                    hostBtn.innerHTML = '🎬 Starting...';
                    hostBtn.disabled = true;
                    createRoom(movie.publicUrl);
                };
                
                renameBtn.onclick = () => renameMovie(movie._id, movie.fileName, movieEl);
                deleteBtn.onclick = () => deleteMovie(movie._id, movie.filePath, movieEl);
                
                movieLibrary.appendChild(movieEl);
            });

        } catch (error) {
            console.error("Failed to load movie library:", error);
            libraryLoadingMessage.innerHTML = `
                <div class="text-center py-12">
                    <div class="text-4xl mb-4">⚠️</div>
                    <p class="text-red-400">Could not load your movies</p>
                    <button onclick="location.reload()" class="mt-4 text-indigo-400 hover:text-indigo-300 transition-colors">
                        Try Again
                    </button>
                </div>
            `;
        }
    }
    
    function renameMovie(movieId, currentName, movieElement) {
        if (!currentUser) {
            showNotification("You must be logged in to rename movies.", "error");
            return;
        }
        
        renameInput.value = currentName;
        renameModal.classList.remove('hidden');
        setTimeout(() => renameInput.focus(), 100);

        const handleSave = async () => {
            const newName = renameInput.value.trim();
            if (!newName || newName === currentName) {
                hideModal();
                return;
            }

            saveRenameBtn.innerHTML = 'Saving...';
            saveRenameBtn.disabled = true;

            try {
                const response = await fetch(`${backendUrl}/api/movies/${movieId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newName, userId: currentUser.uid })
                });
                if (!response.ok) throw new Error('Failed to rename the movie on the server.');
                
                const nameElement = movieElement.querySelector('.movie-name');
                nameElement.textContent = newName;
                showNotification("Movie renamed successfully!", "success");
            } catch (error) {
                console.error("Failed to rename movie:", error);
                showNotification("Error: Could not rename the movie.", "error");
            } finally {
                hideModal();
            }
        };

        const handleKeyPress = (e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') hideModal();
        };

        const hideModal = () => {
            renameModal.classList.add('hidden');
            saveRenameBtn.innerHTML = 'Save Changes';
            saveRenameBtn.disabled = false;
            saveRenameBtn.onclick = null;
            cancelRenameBtn.onclick = null;
            renameInput.onkeypress = null;
        };

        saveRenameBtn.onclick = handleSave;
        cancelRenameBtn.onclick = hideModal;
        renameInput.onkeypress = handleKeyPress;
    }

    /**
     * ✅ FIX: Replaced confirm() with a custom modal for deletion.
     */
    function deleteMovie(movieId, filePath, movieElement) {
        if (!currentUser) {
            showNotification("You must be logged in to delete movies.", "error");
            return;
        }

        deleteModal.classList.remove('hidden');

        const hideModal = () => {
            deleteModal.classList.add('hidden');
            confirmDeleteBtn.onclick = null;
            cancelDeleteBtn.onclick = null;
        };

        confirmDeleteBtn.onclick = async () => {
            hideModal();
            const deleteBtn = movieElement.querySelector('.delete-btn');
            deleteBtn.innerHTML = '⏳';
            deleteBtn.disabled = true;

            try {
                const response = await fetch(`${backendUrl}/api/movies`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ movieId, filePath, userId: currentUser.uid })
                });

                if (!response.ok) throw new Error('Failed to delete the movie on the server.');
                
                movieElement.style.opacity = '0';
                movieElement.style.transform = 'translateX(-100%)';
                setTimeout(() => movieElement.remove(), 300);
                
                showNotification("Movie deleted successfully.", "success");

            } catch (error) {
                console.error("Failed to delete movie:", error);
                showNotification("Error: Could not delete the movie.", "error");
                deleteBtn.innerHTML = 'Delete';
                deleteBtn.disabled = false;
            }
        };
        
        cancelDeleteBtn.onclick = hideModal;
    }

    async function handleFileUpload(file) {
        if (!currentUser) {
            showNotification("You must be logged in to upload a movie.", "error");
            return;
        }
        if (file.type !== 'video/mp4') {
            showNotification('Please select a valid MP4 video file.', "error");
            return;
        }

        progressContainer.classList.remove('hidden');
        uploadStatus.textContent = 'Preparing to upload...';
        progressText.textContent = '0%';

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
                    uploadStatus.textContent = `Uploading... ${percent}%`;
                }
            };
            
            xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(xhr.statusText));
            xhr.onerror = () => reject(new Error('Network error during upload.'));
            xhr.send(file);
        });
    }

    async function createRoom(publicUrl, fileName = null, filePath = null, userId = null) {
        uploadStatus.textContent = 'Creating your movie room...';
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const body = { roomCode, fileId: publicUrl, fileName, filePath, userId };

        try {
            const response = await fetch(`${backendUrl}/api/rooms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!response.ok) throw new Error('Failed to create room on server.');
            
            uploadStatus.textContent = '🎉 Success! Redirecting...';
            setTimeout(() => {
                window.location.href = `watch.html?fileId=${encodeURIComponent(publicUrl)}&roomCode=${roomCode}`;
            }, 1500);
            
        } catch (error) {
            throw new Error('Failed to create room: ' + error.message);
        }
    }

    function showNotification(message, type = 'info') {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `notification fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-lg max-w-sm transition-all duration-300 transform translate-x-full`;
        
        const colors = {
            success: 'bg-green-600 text-white',
            error: 'bg-red-600 text-white',
            info: 'bg-indigo-600 text-white'
        };
        notification.className += ` ${colors[type]}`;
        
        notification.innerHTML = `<div class="flex items-center"><span class="font-medium">${message}</span></div>`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.style.transform = 'translateX(0)', 100);
        setTimeout(() => {
            notification.style.transform = 'translateX(calc(100% + 1.5rem))';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
});
