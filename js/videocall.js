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
 */
async function joinAndDisplayLocalStream(channelName) {
  try {
    // --- THIS IS THE KEY CHANGE ---
    // Set up event listeners BEFORE joining the channel.
    // This ensures we don't miss the event for users who are already in the channel.
    client.on('user-published', handleUserPublished);
    client.on('user-left', handleUserLeft);
    // --- END CHANGE ---

    // Join the channel. The UID is returned upon joining.
    uid = await client.join(AGORA_APP_ID, channelName, null, null);
    console.log(`Successfully joined channel ${channelName} with uid ${uid}`);

    // Create microphone and camera tracks.
    // Requesting permissions here, after the user has initiated an action.
    localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    localTracks.videoTrack = await AgoraRTC.createCameraVideoTrack();

    // Play the local video track in the 'local-player-container'.
    const localPlayerContainer = document.getElementById('local-player-container');
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
  const userId = user.uid;
  console.log(`Remote user published: ${userId}, mediaType: ${mediaType}`); // Added for debugging
  remoteUsers[userId] = user;
  await client.subscribe(user, mediaType);
  console.log(`Subscribed to remote user ${userId}`);

  if (mediaType === 'video') {
    const participantsContainer = document.getElementById('participants-container');
    let playerContainer = document.getElementById(`player-wrapper-${userId}`);

    if (playerContainer === null) {
      playerContainer = document.createElement('div');
      playerContainer.id = `player-wrapper-${userId}`;
      playerContainer.className = 'aspect-video bg-slate-700 rounded-lg overflow-hidden video-container relative';
      
      // Add a label for the remote user
      const nameLabel = document.createElement('div');
      nameLabel.className = 'absolute top-2 left-2 text-xs bg-black/50 px-2 py-1 rounded';
      nameLabel.textContent = `User ${userId}`;
      playerContainer.appendChild(nameLabel);

      participantsContainer.appendChild(playerContainer);
    }
    
    user.videoTrack.play(playerContainer);
  }

  if (mediaType === 'audio') {
    user.audioTrack.play();
  }
}

/**
 * Handles a remote user leaving the channel.
 * @param {object} user - The remote user object from Agora.
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
  
  // Leave the channel.
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
        // Update UI (e.g., button color)
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
        // Update UI (e.g., button color)
        document.getElementById('mic-btn').style.backgroundColor = isEnabled ? 'rgb(220 38 38)' : 'rgb(71 85 105)';
    }
}
