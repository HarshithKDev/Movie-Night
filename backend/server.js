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
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
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

// (WebSocket server logic remains the same)
const rooms = {};
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'join') {
        const { roomCode } = data;
        ws.roomCode = roomCode;
        if (!rooms[roomCode]) rooms[roomCode] = { clients: new Set(), state: { isPlaying: false, currentTime: 0, lastUpdated: Date.now() } };
        rooms[roomCode].clients.add(ws);
        ws.send(JSON.stringify({ type: 'sync-state', state: rooms[roomCode].state }));
      }
      if (['play', 'pause', 'seek'].includes(data.type)) {
        const { roomCode } = ws;
        if (rooms[roomCode]) {
          rooms[roomCode].state.isPlaying = data.type === 'play';
          if (data.time !== undefined) rooms[roomCode].state.currentTime = data.time;
          rooms[roomCode].state.lastUpdated = Date.now();
          rooms[roomCode].clients.forEach(client => {
            if (client !== ws && client.readyState === client.OPEN) {
              client.send(JSON.stringify(data));
            }
          });
        }
      }
    } catch (error) { console.error('WS message error:', error); }
  });
  ws.on('close', () => {
    const { roomCode } = ws;
    if (roomCode && rooms[roomCode]) {
      rooms[roomCode].clients.delete(ws);
      if (rooms[roomCode].clients.size === 0) delete rooms[roomCode];
    }
  });
});


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

    // --- ✅ NEW: Endpoint to rename a movie ---
    app.put('/api/movies/:movieId', async (req, res) => {
        const { movieId } = req.params;
        const { newName, userId } = req.body;
        if (!newName || !userId) {
            return res.status(400).json({ message: 'newName and userId are required' });
        }
        try {
            const movie = await moviesCollection.findOne({ _id: new ObjectId(movieId), userId });
            if (!movie) {
                return res.status(404).json({ message: 'Movie not found or user not authorized' });
            }

            await moviesCollection.updateOne(
                { _id: new ObjectId(movieId) },
                { $set: { fileName: newName } }
            );
            res.status(200).json({ message: 'Movie renamed successfully' });
        } catch (error) {
            console.error("❌ Failed to rename movie", error);
            res.status(500).json({ message: 'Failed to rename movie' });
        }
    });

    // (Other endpoints remain the same)
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
