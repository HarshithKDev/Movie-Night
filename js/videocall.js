const AGORA_APP_ID = '938b4e3a12654e849dc519184e9a5596';
const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

let localTracks = { videoTrack: null, audioTrack: null };

async function joinAndDisplayLocalStream(channelName, userName) {
    try {
        await client.join(AGORA_APP_ID, channelName, null, userName);
        client.on('user-published', handleUserPublished);
        client.on('user-left', handleUserLeft);

        localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localTracks.videoTrack = await AgoraRTC.createCameraVideoTrack();

        localTracks.videoTrack.play('local-player-container');

        await client.publish(Object.values(localTracks));
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
            participantDiv.className = 'flex items-center gap-3 p-2 rounded-lg';
            participantDiv.innerHTML = `
                <div id="remote-player-${userId}" class="w-16 h-12 bg-surface rounded-md overflow-hidden flex-shrink-0"></div>
                <p class="font-medium flex-1 truncate">${userId}</p>
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
        document.getElementById('mic-btn').classList.toggle('bg-error', isEnabled);
        document.getElementById('mic-btn').classList.toggle('text-on-primary', isEnabled);
    }
}

async function toggleCamera() {
    if (localTracks.videoTrack) {
        const isEnabled = localTracks.videoTrack.enabled;
        await localTracks.videoTrack.setEnabled(!isEnabled);
        document.getElementById('camera-btn').classList.toggle('bg-error', isEnabled);
        document.getElementById('camera-btn').classList.toggle('text-on-primary', isEnabled);
    }
}