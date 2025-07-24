require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const admin = require('firebase-admin');

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

// --- FINAL: Robust CORS Configuration ---
const allowedOrigins = ['https://movienight2025.netlify.app'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors()); // Handle preflight
// --- END CORS SETUP ---

// Middleware
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// --- WebSocket Logic ---
const rooms = {};
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'join') {
        const { roomCode } = data;
        ws.roomCode = roomCode;
        if (!rooms[roomCode]) rooms[roomCode] = new Set();
        rooms[roomCode].add(ws);
      }
      if (['play', 'pause', 'seek'].includes(data.type)) {
        const { roomCode } = ws;
        if (rooms[roomCode]) {
          rooms[roomCode].forEach(client => {
            if (client !== ws && client.readyState === client.OPEN) {
              client.send(JSON.stringify(data));
            }
          });
        }
      }
    } catch (error) {
      console.error('WS message error:', error);
    }
  });

  ws.on('close', () => {
    const { roomCode } = ws;
    if (roomCode && rooms[roomCode]) {
      rooms[roomCode].delete(ws);
      if (rooms[roomCode].size === 0) delete rooms[roomCode];
    }
  });
});

// --- MongoDB Connection and Routes ---
const client = new MongoClient(process.env.MONGO_URI, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

async function run() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB Atlas");

    const db = client.db("movieNightDB");
    const roomsCollection = db.collection("rooms");

    // --- Signed Upload URL Endpoint ---
    app.post('/api/generate-upload-url', async (req, res) => {
      const { fileName, fileType } = req.body;

      if (!fileName || !fileType) {
        return res.status(400).json({ message: 'fileName and fileType are required' });
      }

      const filePath = `videos/${Date.now()}-${fileName}`;
      const file = bucket.file(filePath);

      const options = {
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType: fileType,
      };

      try {
        const [signedUrl] = await file.getSignedUrl(options);
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        res.status(200).json({ signedUrl, publicUrl });
      } catch (error) {
        console.error("❌ Failed to generate signed URL", error);
        res.status(500).json({ message: 'Could not generate upload URL' });
      }
    });

    // --- Room Creation ---
    app.post('/api/rooms', async (req, res) => {
      const { roomCode, fileId } = req.body;
      const newRoom = { roomCode, fileId, createdAt: new Date() };
      await roomsCollection.insertOne(newRoom);
      res.status(201).json(newRoom);
    });

    // --- Get Room Info ---
    app.get('/api/rooms/:roomCode', async (req, res) => {
      const { roomCode } = req.params;
      const room = await roomsCollection.findOne({ roomCode });
      if (room) {
        res.status(200).json({ fileId: room.fileId });
      } else {
        res.status(404).json({ message: 'Room not found' });
      }
    });

    // --- Start the Server ---
    server.listen(port, "0.0.0.0", () => {
      console.log(`🚀 Server listening on port ${port}`);
    });

  } catch (err) {
    console.error("❌ MongoDB connection failed", err);
  }
}

run();