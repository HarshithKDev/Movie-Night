// ========================
// Video Call Logic (Agora)
// ========================

const AGORA_APP_ID = '938b4e3a12654e849dc519184e9a5596'; // Your Agora App ID

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

let localTracks = {
  videoTrack: null,
  audioTrack: null
};

let remoteUsers = {};
let uid; // To store the local user's ID

/**
 * Initializes the video call, joins the channel, and publishes the local stream.
 * @param {string} channelName - The room code to use as the channel name.
 * @param {string} userName - The display name of the local user.
 */
async function joinAndDisplayLocalStream(channelName, userName) {
  try {
    // --- ✅ NEW: Pass the user's name as their UID when joining ---
    // Agora allows string UIDs, so we can use the user's name directly.
    // For production, you'd use the unique Firebase UID and pass the name separately.
    uid = await client.join(AGORA_APP_ID, channelName, null, userName);
    console.log(`Successfully joined channel ${channelName} as ${userName}`);

    // Set up event listeners BEFORE joining the channel.
    client.on('user-published', handleUserPublished);
    client.on('user-left', handleUserLeft);

    // Create microphone and camera tracks.
    localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    localTracks.videoTrack = await AgoraRTC.createCameraVideoTrack();

    // Play the local video track in the 'local-player-container'.
    const localPlayerContainer = document.getElementById('local-player-container');
    const localNameLabel = document.getElementById('local-user-name');
    if (localNameLabel) localNameLabel.textContent = userName; // Set the local user's name
    
    localTracks.videoTrack.play(localPlayerContainer);

    // Publish the local tracks to the channel.
    await client.publish(Object.values(localTracks));
    console.log("Local stream published successfully.");

  } catch (error) {
    console.error('Failed to join channel or create local tracks', error);
  }
}

/**
 * Handles a remote user joining and publishing their stream.
 * @param {object} user - The remote user object from Agora.
 * @param {string} mediaType - 'audio' or 'video'.
 */
async function handleUserPublished(user, mediaType) {
  const userId = user.uid; // This will now be the user's name
  remoteUsers[userId] = user;
  await client.subscribe(user, mediaType);
  console.log(`Subscribed to remote user ${userId}`);

  if (mediaType === 'video') {
    const participantsContainer = document.getElementById('participants-container');
    let playerContainer = document.getElementById(`player-wrapper-${userId}`);

    if (playerContainer === null) {
      playerContainer = document.createElement('div');
      playerContainer.id = `player-wrapper-${userId}`;
      playerContainer.className = 'relative flex-shrink-0'; // Use the same structure as the local player

      // Create the inner structure for the remote player
      playerContainer.innerHTML = `
        <div class="aspect-video bg-slate-700 rounded-lg overflow-hidden video-container">
            <!-- Remote video will be injected here by .play() -->
        </div>
        <div class="absolute top-2 left-2 text-xs bg-black/50 px-2 py-1 rounded z-10 pointer-events-none">${userId}</div>
      `;
      
      participantsContainer.appendChild(playerContainer);
    }
    
    // Play the video inside the newly created container
    const videoContainer = playerContainer.querySelector('.video-container');
    user.videoTrack.play(videoContainer);
  }

  if (mediaType === 'audio') {
    user.audioTrack.play();
  }
}

/**
 * Handles a remote user leaving the channel.
 */
function handleUserLeft(user) {
  const userId = user.uid;
  delete remoteUsers[userId];
  const playerWrapper = document.getElementById(`player-wrapper-${userId}`);
  if (playerWrapper) {
    playerWrapper.remove();
  }
  console.log(`User ${userId} has left the channel.`);
}

/**
 * Leaves the Agora channel and cleans up local tracks.
 */
async function leaveChannel() {
  for (let trackName in localTracks) {
    let track = localTracks[trackName];
    if (track) {
      track.stop();
      track.close();
      localTracks[trackName] = null;
    }
  }
  
  await client.leave();
  console.log("Left the channel successfully.");
}

/**
 * Toggles the local camera on and off.
 */
async function toggleCamera() {
    if (localTracks.videoTrack) {
        const isEnabled = localTracks.videoTrack.enabled;
        await localTracks.videoTrack.setEnabled(!isEnabled);
        document.getElementById('camera-btn').style.backgroundColor = isEnabled ? 'rgb(220 38 38)' : 'rgb(71 85 105)';
    }
}

/**
 * Toggles the local microphone on and off.
 */
async function toggleMic() {
    if (localTracks.audioTrack) {
        const isEnabled = localTracks.audioTrack.enabled;
        await localTracks.audioTrack.setEnabled(!isEnabled);
        document.getElementById('mic-btn').style.backgroundColor = isEnabled ? 'rgb(220 38 38)' : 'rgb(71 85 105)';
    }
}
