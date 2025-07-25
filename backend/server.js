require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const http = require('http');
const { WebSocketServer } = require('ws');
const admin = require('firebase-admin');
const cors = require('cors');

// --- Firebase Admin SDK Initialization ---
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : require('./firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'movienight-firebase.firebasestorage.app'
});

const bucket = admin.storage().bucket();
// --- End Firebase Initialization ---

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// --- ✅ NEW: Room State Management ---
// This object will now store the clients AND the video state for each room.
const rooms = {};

wss.on('connection', (ws) => {
  console.log('Client connected via WebSocket');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const { roomCode } = data;

      // When a user first connects, they will send a 'join' event
      if (data.type === 'join') {
        ws.roomCode = roomCode;

        // If the room doesn't exist, create it with a default state
        if (!rooms[roomCode]) {
          rooms[roomCode] = {
            clients: new Set(),
            state: { isPlaying: false, currentTime: 0, lastUpdated: Date.now() }
          };
        }
        // Add the new client to the room
        rooms[roomCode].clients.add(ws);
        console.log(`Client joined room: ${roomCode}. Total clients: ${rooms[roomCode].clients.size}`);

        // --- ✅ CRITICAL FIX: Immediately send the current state to the new user ---
        ws.send(JSON.stringify({ type: 'sync-state', state: rooms[roomCode].state }));
      }

      // When a client sends a playback event (play, pause, seek)
      if (['play', 'pause', 'seek'].includes(data.type)) {
        if (rooms[roomCode]) {
          // Update the server's state for this room
          rooms[roomCode].state.isPlaying = data.type === 'play';
          if (data.time !== undefined) {
            rooms[roomCode].state.currentTime = data.time;
          }
          rooms[roomCode].state.lastUpdated = Date.now();

          // Broadcast the event to all other clients in the same room
          rooms[roomCode].clients.forEach(client => {
            if (client !== ws && client.readyState === client.OPEN) {
              client.send(JSON.stringify(data));
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to process WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    const { roomCode } = ws;
    if (roomCode && rooms[roomCode]) {
      rooms[roomCode].clients.delete(ws);
      console.log(`Client left room: ${roomCode}. Total clients: ${rooms[roomCode].clients.size}`);
      if (rooms[roomCode].clients.size === 0) {
        delete rooms[roomCode]; // Clean up empty rooms
        console.log(`Room ${roomCode} is now empty and has been closed.`);
      }
    }
    console.log('Client disconnected');
  });
});

// (The rest of the file remains the same)
const client = new MongoClient(process.env.MONGO_URI, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

async function run() {
  try {
    await client.connect();
    console.log("✅ Successfully connected to MongoDB Atlas!");
    
    const db = client.db("movieNightDB");
    const roomsCollection = db.collection("rooms");
    const moviesCollection = db.collection("movies");

    app.post('/api/generate-upload-url', async (req, res) => {
        const { fileName, fileType } = req.body;
        const filePath = `videos/${Date.now()}-${fileName}`;
        const file = bucket.file(filePath);
        const options = { version: 'v4', action: 'write', expires: Date.now() + 15 * 60 * 1000, contentType: fileType };
        try {
            const [signedUrl] = await file.getSignedUrl(options);
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
            res.status(200).json({ signedUrl, publicUrl, filePath });
        } catch (error) { res.status(500).json({ message: 'Could not generate upload URL' }); }
    });

    app.post('/api/get-stream-url', async (req, res) => {
        const { publicUrl } = req.body;
        try {
            const urlParts = new URL(publicUrl);
            const filePath = urlParts.pathname.substring(1).split('/').slice(1).join('/');
            const file = bucket.file(filePath);
            const options = { version: 'v4', action: 'read', expires: Date.now() + 60 * 60 * 1000 };
            const [streamUrl] = await file.getSignedUrl(options);
            res.status(200).json({ streamUrl });
        } catch (error) { res.status(500).json({ message: 'Could not generate stream URL' }); }
    });

    app.get('/api/movies/:userId', async (req, res) => {
        const { userId } = req.params;
        const movies = await moviesCollection.find({ userId }).toArray();
        res.status(200).json(movies);
    });

    app.delete('/api/movies', async (req, res) => {
        const { movieId, filePath, userId } = req.body;
        const movie = await moviesCollection.findOne({ _id: new ObjectId(movieId), userId });
        if (!movie) return res.status(404).json({ message: 'Movie not found or user not authorized' });
        await bucket.file(filePath).delete();
        await moviesCollection.deleteOne({ _id: new ObjectId(movieId) });
        res.status(200).json({ message: 'Movie deleted successfully' });
    });

    app.post('/api/rooms', async (req, res) => {
      const { roomCode, fileId, fileName, filePath, userId } = req.body;
      if (userId) await moviesCollection.insertOne({ userId, fileName, publicUrl: fileId, filePath, createdAt: new Date() });
      const newRoom = { roomCode, fileId, createdAt: new Date() };
      await roomsCollection.insertOne(newRoom);
      res.status(201).json(newRoom);
    });

    app.get('/api/rooms/:roomCode', async (req, res) => {
      const { roomCode } = req.params;
      const room = await roomsCollection.findOne({ roomCode });
      if (room) res.status(200).json({ fileId: room.fileId });
      else res.status(404).json({ message: 'Room not found' });
    });

    server.listen(port, "0.0.0.0", () => {
      console.log(`🚀 Server listening on port ${port}`);
    });

  } catch(err) {
    console.error("❌ Failed to connect to MongoDB", err);
  }
}

run();
