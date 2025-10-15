const AGORA_APP_ID = '938b4e3a12654e849dc519184e9a5596';
const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

let localTracks = { videoTrack: null, audioTrack: null };

async function joinAndDisplayLocalStream(channelName, userName) {
    try {
        const uid = await client.join(AGORA_APP_ID, channelName, null, userName);
        client.on('user-published', handleUserPublished);
        client.on('user-left', handleUserLeft);
        client.on('volume-indicator', handleVolumeIndicator);

        localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localTracks.videoTrack = await AgoraRTC.createCameraVideoTrack();

        localTracks.videoTrack.play('local-player-container');

        await client.publish(Object.values(localTracks));
        client.enableAudioVolumeIndicator();

    } catch (error) {
        console.error('Agora client setup failed', error);
    }
}

async function handleUserPublished(user, mediaType) {
    await client.subscribe(user, mediaType);
    const userId = user.uid;

    if (mediaType === 'video') {
        const participantsContainer = document.getElementById('participants-container');
        let participantDiv = document.getElementById(`participant-${userId}`);
        if (!participantDiv) {
            participantDiv = document.createElement('div');
            participantDiv.id = `participant-${userId}`;
            participantDiv.className = 'flex flex-col gap-2 participant-container';
            participantDiv.innerHTML = `
                <div id="remote-player-${userId}" class="w-full aspect-video bg-background rounded-md overflow-hidden"></div>
                <p class="font-medium text-sm text-center truncate">${userId}</p>
            `;
            participantsContainer.appendChild(participantDiv);
        }
        user.videoTrack.play(`remote-player-${userId}`);
    }

    if (mediaType === 'audio') {
        user.audioTrack.play();
    }
}

function handleUserLeft(user) {
    document.getElementById(`participant-${user.uid}`)?.remove();
}

function handleVolumeIndicator(volumes) {
    volumes.forEach((volume) => {
        const speakerId = volume.uid;
        const speakerContainer = document.getElementById(speakerId === 0 ? 'local-player-container' : `remote-player-${speakerId}`);
        if (speakerContainer) {
            if (volume.level > 10) {
                speakerContainer.classList.add('speaking');
            } else {
                speakerContainer.classList.remove('speaking');
            }
        }
    });
}


async function leaveChannel() {
    for (const trackName in localTracks) {
        const track = localTracks[trackName];
        if (track) {
            track.stop();
            track.close();
            localTracks[trackName] = null;
        }
    }
    await client.leave();
}

async function toggleMic() {
    if (localTracks.audioTrack) {
        const isEnabled = localTracks.audioTrack.enabled;
        await localTracks.audioTrack.setEnabled(!isEnabled);
        const micBtn = document.getElementById('mic-btn');
        micBtn.innerHTML = isEnabled ? '<i data-lucide="mic-off" class="w-4 h-4 text-error"></i>' : '<i data-lucide="mic" class="w-4 h-4"></i>';
        lucide.createIcons();
    }
}

async function toggleCamera() {
    if (localTracks.videoTrack) {
        const isEnabled = localTracks.videoTrack.enabled;
        await localTracks.videoTrack.setEnabled(!isEnabled);
        const cameraBtn = document.getElementById('camera-btn');
        cameraBtn.innerHTML = isEnabled ? '<i data-lucide="video-off" class="w-4 h-4 text-error"></i>' : '<i data-lucide="video" class="w-4 h-4"></i>';
        lucide.createIcons();
    }
}