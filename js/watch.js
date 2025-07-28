// Enhanced watch.js with professional UI, responsiveness, and cinematic video player
// This file requires auth.js to be loaded first to access firebase and auth objects.

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const fileId = decodeURIComponent(params.get('fileId'));
    const roomCode = params.get('roomCode');

    // DOM Elements
    const roomCodeTextEl = document.getElementById('room-code-text');
    const exitButtonEl = document.getElementById('exit-button');
    const copyRoomCodeBtn = document.getElementById('copy-room-code-btn');
    const micBtn = document.getElementById('mic-btn');
    const cameraBtn = document.getElementById('camera-btn');
    const unmuteOverlay = document.getElementById('unmute-overlay');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    // ✅ FIX: Elements for responsive sidebar
    const sidebarToggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('participants-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (!fileId || !roomCode) {
        showNotification('Missing room information. Redirecting...', 'error');
        setTimeout(() => window.location.href = 'index.html', 2000);
        return;
    }

    animateRoomCode(roomCodeTextEl, roomCode);
    
    const player = videojs('movie-player', {
        fluid: true,
        responsive: true,
        playbackRates: [0.5, 1, 1.25, 1.5, 2],
        controlBar: {
            children: [
                'playToggle',
                'volumePanel',
                'currentTimeDisplay',
                'timeDivider',
                'durationDisplay',
                'progressControl',
                'liveDisplay',
                'seekToLive',
                'remainingTimeDisplay',
                'customControlSpacer',
                'playbackRateMenuButton',
                'fullscreenToggle',
            ],
        },
    });

    await loadVideo(player, fileId, loadingOverlay);
    initializeAuth();
    setupVideoSync(player, roomCode);
    setupEnhancedControls(player, unmuteOverlay, micBtn, cameraBtn);
    setupButtonInteractions(exitButtonEl, copyRoomCodeBtn, roomCode);
    setupResponsiveSidebar(sidebarToggleBtn, sidebar, sidebarOverlay); // ✅ FIX: Initialize sidebar logic

    function animateRoomCode(element, code) {
        if (!element) return;
        element.textContent = '';
        let index = 0;
        const typeInterval = setInterval(() => {
            element.textContent += code[index++];
            if (index >= code.length) clearInterval(typeInterval);
        }, 100);
    }

    async function loadVideo(player, fileId, loadingOverlay) {
        try {
            const backendUrl = 'https://movienight-backend-veka.onrender.com';
            const response = await fetch(`${backendUrl}/api/get-stream-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ publicUrl: fileId }),
            });
            if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
            const data = await response.json();
            player.src({ src: data.streamUrl, type: 'video/mp4' });
            player.ready(() => {
                loadingOverlay.style.opacity = '0';
                setTimeout(() => loadingOverlay.style.display = 'none', 500);
            });
            player.on('error', () => handleVideoError(player));
        } catch (error) {
            handleVideoError(player, error.message);
        }
    }

    function handleVideoError(player, message = 'Could not load video') {
        const wrapper = document.getElementById('video-js-wrapper');
        if (wrapper) {
            wrapper.innerHTML = `<div class="w-full h-full flex items-center justify-center text-center p-4 bg-slate-800 rounded-lg"><div><h3 class="text-2xl font-bold text-red-400 mb-2">Video Error</h3><p class="text-slate-300">${message}</p></div></div>`;
        }
        loadingOverlay.style.display = 'none';
    }

    function initializeAuth() {
        auth.onAuthStateChanged(user => {
            const userName = user ? (user.displayName || user.email?.split('@')[0]) : `Guest${Math.floor(Math.random() * 1000)}`;
            if (typeof joinAndDisplayLocalStream === 'function') {
                joinAndDisplayLocalStream(roomCode, userName);
            }
            const nameEl = document.querySelector('#local-user-name span');
            if(nameEl) nameEl.textContent = user ? 'You' : userName;
        });
    }

    function setupVideoSync(player, roomCode) {
        const ws = new WebSocket('wss://movienight-backend-veka.onrender.com');
        let receivedEvent = false;
        ws.onopen = () => {
            ws.send(JSON.stringify({ type: 'join', roomCode }));
            showNotification('Sync connection established', 'success');
        };
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            receivedEvent = true;
            switch (data.type) {
                case 'sync-state':
                    player.currentTime(data.state.currentTime);
                    data.state.isPlaying ? player.play() : player.pause();
                    break;
                case 'play': if (player.paused()) player.play(); break;
                case 'pause': if (!player.paused()) player.pause(); break;
                case 'seek': player.currentTime(data.time); break;
            }
            setTimeout(() => receivedEvent = false, 250);
        };
        ws.onclose = () => showNotification('Sync connection lost', 'error');
        ws.onerror = () => showNotification('Sync connection error', 'error');

        const sendEvent = (type, time) => {
            if (ws.readyState === WebSocket.OPEN && !receivedEvent) {
                ws.send(JSON.stringify({ type, roomCode, time }));
            }
        };
        player.on('play', () => sendEvent('play'));
        player.on('pause', () => sendEvent('pause'));
        player.on('seeked', () => sendEvent('seek', player.currentTime()));
        window.movieWS = ws;
    }

    function setupEnhancedControls(player, unmuteOverlay, micBtn, cameraBtn) {
        unmuteOverlay.addEventListener('click', () => {
            player.muted(false);
            player.volume(1.0);
            unmuteOverlay.style.display = 'none';
            player.play();
            showNotification('Audio enabled', 'success');
        }, { once: true });

        micBtn.addEventListener('click', () => {
            if (typeof toggleMic === 'function') toggleMic();
            const muted = micBtn.classList.toggle('muted');
            showNotification(`Microphone ${muted ? 'muted' : 'unmuted'}`, 'info');
        });

        cameraBtn.addEventListener('click', () => {
            if (typeof toggleCamera === 'function') toggleCamera();
            const muted = cameraBtn.classList.toggle('muted');
            showNotification(`Camera ${muted ? 'off' : 'on'}`, 'info');
        });
    }

    function setupButtonInteractions(exitBtn, copyBtn, roomCode) {
        exitBtn.onclick = async () => {
            if (!confirm('Are you sure you want to leave?')) return;
            if (typeof leaveChannel === 'function') await leaveChannel();
            if (window.movieWS) window.movieWS.close();
            window.location.href = 'index.html';
        };
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(roomCode);
            showNotification('Room code copied!', 'success');
            const originalText = copyBtn.querySelector('span').textContent;
            copyBtn.querySelector('span').textContent = 'COPIED!';
            setTimeout(() => copyBtn.querySelector('span').textContent = originalText, 2000);
        };
    }
    
    // ✅ FIX: Logic for the responsive sidebar
    function setupResponsiveSidebar(toggleBtn, sidebar, overlay) {
        if (!toggleBtn || !sidebar || !overlay) return;
        const closeSidebar = () => {
            sidebar.classList.remove('is-open');
            overlay.classList.remove('is-open');
        };
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('is-open');
            overlay.classList.toggle('is-open');
        });
        overlay.addEventListener('click', closeSidebar);
        document.addEventListener('keydown', (e) => {
            if (e.key === "Escape" && sidebar.classList.contains('is-open')) {
                closeSidebar();
            }
        });
    }

    // ✅ FIX: Minimalist, emoji-free notification system
    function showNotification(message, type = 'info') {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `notification fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300`;
        
        const colors = {
            success: 'bg-green-600/90',
            error: 'bg-red-600/90',
            info: 'bg-slate-700/90'
        };
        notification.classList.add(colors[type] || colors.info);
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        notification.style.transform = 'translate(-50%, 10px)';
        notification.style.opacity = '0';

        setTimeout(() => {
            notification.style.transform = 'translate(-50%, 0)';
            notification.style.opacity = '1';
        }, 100);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
});
