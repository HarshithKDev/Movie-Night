require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const http = require('http');
const { WebSocketServer } = require('ws');
const admin = require('firebase-admin');
const cors = require('cors');
const { body, param, validationResult } = require('express-validator');
const url = require('url');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

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

// --- Security Middleware ---

// 1. CORS Configuration
const allowedOrigins = ['https://movienightlive.netlify.app', 'http://localhost:3000', 'http://127.0.0.1:5500'];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};
app.use(cors(corsOptions));

// 2. Rate Limiting
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api/', apiLimiter);

// Middleware
app.use(express.json());

const server = http.createServer(app);

// --- WebSocket Server with Authentication ---
const wss = new WebSocketServer({
    server,
    verifyClient: async (info, done) => {
        const { query } = url.parse(info.req.url, true);
        const token = query.token;

        if (!token) {
            return done(false, 401, 'Unauthorized');
        }

        try {
            const decodedToken = await admin.auth().verifyIdToken(token);
            info.req.user = decodedToken; // Pass decoded token to connection handler
            done(true);
        } catch (e) {
            console.error('WebSocket auth error:', e.message);
            done(false, 403, 'Forbidden');
        }
    }
});

// --- Authentication Middleware ---
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('Unauthorized: No token provided');
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(403).send('Unauthorized: Invalid token');
  }
};

// Health check route
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Server is awake and running!' });
});

const rooms = {};
wss.on('connection', (ws, req) => {
    const { query } = url.parse(req.url, true);
    const roomCode = query.roomCode;
    const user = req.user; // User object from verifyClient

    if (!roomCode) {
        ws.close(1008, 'Room code is required');
        return;
    }

    // SECURITY FIX: Periodically check if the auth token has expired
    const tokenExpirationCheck = setInterval(() => {
        const currentTimeInSeconds = Math.floor(Date.now() / 1000);
        if (user.exp < currentTimeInSeconds) {
            console.log(`Closing WebSocket for user ${user.uid} due to expired token.`);
            ws.close(4001, 'Authentication token expired');
        }
    }, 15 * 60 * 1000); // Check every 15 minutes

    ws.roomCode = roomCode;
    if (!rooms[roomCode]) {
        rooms[roomCode] = { clients: new Set(), state: { isPlaying: false, currentTime: 0, lastUpdated: Date.now() } };
    }
    rooms[roomCode].clients.add(ws);
    ws.send(JSON.stringify({ type: 'sync-state', state: rooms[roomCode].state }));
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (['play', 'pause', 'seek'].includes(data.type)) {
                if (rooms[ws.roomCode]) {
                    rooms[ws.roomCode].state.isPlaying = data.type === 'play';
                    if (data.time !== undefined) rooms[ws.roomCode].state.currentTime = data.time;
                    rooms[ws.roomCode].state.lastUpdated = Date.now();
                    rooms[ws.roomCode].clients.forEach(client => {
                        if (client !== ws && client.readyState === client.OPEN) {
                            client.send(JSON.stringify(data));
                        }
                    });
                }
            }
        } catch (error) { console.error('WS message error:', error); }
    });

    ws.on('close', () => {
        clearInterval(tokenExpirationCheck); // Stop checking on disconnect
        if (ws.roomCode && rooms[ws.roomCode]) {
            rooms[ws.roomCode].clients.delete(ws);
            if (rooms[ws.roomCode].clients.size === 0) {
                delete rooms[ws.roomCode];
            }
        }
    });
});

const client = new MongoClient(process.env.MONGO_URI, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

async function run() {
  try {
    await client.connect();
    console.log("✅ Successfully connected to MongoDB Atlas!");
    
    const db = client.db("movieNightDB");
    const roomsCollection = db.collection("rooms");
    const moviesCollection = db.collection("movies");

    app.put('/api/movies/:movieId', authenticateUser, [
        param('movieId').isMongoId(),
        body('newName').notEmpty().trim().escape()
    ], handleValidationErrors, async (req, res) => {
        try {
            const { movieId } = req.params;
            const { newName } = req.body;
            const result = await moviesCollection.updateOne(
                { _id: new ObjectId(movieId), userId: req.user.uid },
                { $set: { fileName: newName } }
            );
            if (result.matchedCount === 0) {
                return res.status(404).json({ message: 'Movie not found or user not authorized' });
            }
            res.status(200).json({ message: 'Movie renamed successfully' });
        } catch (error) {
            // SECURITY FIX: Log detailed error, send generic message
            console.error("❌ Failed to rename movie:", error);
            res.status(500).json({ message: 'An internal server error occurred.' });
        }
    });

    app.post('/api/generate-upload-url', authenticateUser, [
        body('fileName').notEmpty().trim(),
        body('fileType').equals('video/mp4')
    ], handleValidationErrors, async (req, res) => {
        try {
            const { fileName, fileType } = req.body;
            const uniqueFileName = `${uuidv4()}${path.extname(fileName)}`;
            const filePath = `videos/${uniqueFileName}`;
            const file = bucket.file(filePath);
            const options = { version: 'v4', action: 'write', expires: Date.now() + 15 * 60 * 1000, contentType: fileType };
            const [signedUrl] = await file.getSignedUrl(options);
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
            res.status(200).json({ signedUrl, publicUrl, filePath });
        } catch (error) {
            // SECURITY FIX: Log detailed error, send generic message
            console.error("Error generating upload URL:", error);
            res.status(500).json({ message: 'An internal server error occurred.' });
        }
    });

    app.post('/api/get-stream-url', authenticateUser, [body('publicUrl').isURL()], handleValidationErrors, async (req, res) => {
        try {
            const { publicUrl } = req.body;
            const urlParts = new URL(publicUrl);
            const filePath = urlParts.pathname.substring(1).split('/').slice(1).join('/');
            const file = bucket.file(filePath);
            const options = { version: 'v4', action: 'read', expires: Date.now() + 60 * 60 * 1000 };
            const [streamUrl] = await file.getSignedUrl(options);
            res.status(200).json({ streamUrl });
        } catch (error) {
            // SECURITY FIX: Log detailed error, send generic message
            console.error("Error generating stream URL:", error);
            res.status(500).json({ message: 'An internal server error occurred.' });
        }
    });

    app.get('/api/movies/:userId', authenticateUser, [param('userId').isString()], handleValidationErrors, async (req, res) => {
        if (req.params.userId !== req.user.uid) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const movies = await moviesCollection.find({ userId: req.params.userId }).toArray();
        res.status(200).json(movies);
    });

    app.delete('/api/movies', authenticateUser, [
        body('movieId').isMongoId(),
        body('filePath').notEmpty()
    ], handleValidationErrors, async (req, res) => {
        try {
            const { movieId, filePath } = req.body;
            const movie = await moviesCollection.findOne({ _id: new ObjectId(movieId), userId: req.user.uid });
            if (!movie) return res.status(404).json({ message: 'Movie not found or user not authorized' });
            
            await bucket.file(filePath).delete();
            await moviesCollection.deleteOne({ _id: new ObjectId(movieId) });
            res.status(200).json({ message: 'Movie deleted successfully' });
        } catch (error) {
            // SECURITY FIX: Log detailed error, send generic message
            console.error('Error deleting movie:', error);
            res.status(500).json({ message: 'An internal server error occurred.' });
        }
    });

    app.post('/api/rooms', authenticateUser, [
        body('roomCode').isLength({ min: 6, max: 6 }).isAlphanumeric().trim(),
        body('fileId').isURL(),
        body('fileName').notEmpty().trim(),
        body('filePath').notEmpty().trim()
    ], handleValidationErrors, async (req, res) => {
        const { roomCode, fileId, fileName, filePath } = req.body;
        const existingMovie = await moviesCollection.findOne({ filePath, userId: req.user.uid });
        if (!existingMovie) {
            await moviesCollection.insertOne({ userId: req.user.uid, fileName, publicUrl: fileId, filePath, createdAt: new Date() });
        }
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