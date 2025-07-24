require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const http = require('http');
const { WebSocketServer } = require('ws');
const admin = require('firebase-admin');

// --- ✅ Definitive Firebase Admin SDK Initialization with Debugging ---
try {
  console.log("Attempting to initialize Firebase Admin SDK...");

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountString) {
    // This will be the error if the environment variable is missing on Render.
    throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable not found.");
  }
  console.log("✅ FIREBASE_SERVICE_ACCOUNT variable was found.");

  // This is the most likely point of failure. If the JSON is malformed, it will crash here.
  const serviceAccount = JSON.parse(serviceAccountString);
  console.log("✅ Successfully parsed service account JSON.");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'movienight-firebase.firebasestorage.app'
  });
  console.log("✅ Firebase Admin SDK initialized successfully.");

} catch (error) {
  // --- THIS IS THE CRITICAL ERROR MESSAGE ---
  console.error("!!!!!!!!!!!!!!!!!!!!!!! FATAL STARTUP ERROR !!!!!!!!!!!!!!!!!!!!!!!");
  console.error("!!! The backend server crashed during Firebase initialization. !!!");
  console.error("!!! This is almost certainly due to an incorrect or malformed   !!!");
  console.error("!!! FIREBASE_SERVICE_ACCOUNT environment variable on Render.     !!!");
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.error("Actual Error Message:", error.message);
  // We exit the process to ensure the crash is visible in the logs.
  process.exit(1);
}
// --- End Firebase Initialization ---

const bucket = admin.storage().bucket();
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

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
    } catch (error) { console.error('WS message error:', error); }
  });
  ws.on('close', () => {
    const { roomCode } = ws;
    if (roomCode && rooms[roomCode]) {
      rooms[roomCode].delete(ws);
      if (rooms[roomCode].size === 0) delete rooms[roomCode];
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
            expires: Date.now() + 15 * 60 * 1000,
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

    app.post('/api/rooms', async (req, res) => {
      const { roomCode, fileId } = req.body;
      const newRoom = { roomCode, fileId, createdAt: new Date() };
      await roomsCollection.insertOne(newRoom);
      res.status(201).json(newRoom);
    });

    app.get('/api/rooms/:roomCode', async (req, res) => {
      const { roomCode } = req.params;
      const room = await roomsCollection.findOne({ roomCode });
      if (room) {
        res.status(200).json({ fileId: room.fileId });
      } else {
        res.status(404).json({ message: 'Room not found' });
      }
    });

    server.listen(port, "0.0.0.0", () => {
      console.log(`🚀 Server listening on port ${port}`);
    });

  } catch(err) {
    console.error("❌ Failed to connect to MongoDB", err);
  }
}

run();
