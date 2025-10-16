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
const helmet = require('helmet');

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

// 1. Helmet with specific CSP for WebSockets
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        // Explicitly allow WebSocket and other connections required by the app
        "connect-src": [
            "'self'",
            "http://localhost:3000",
            "ws://localhost:3000",
            "https://movienight-backend-veka.onrender.com",
            "wss://movienight-backend-veka.onrender.com",
            "https://securetoken.googleapis.com",
            "https://identitytoolkit.googleapis.com",
            "https://www.gstatic.com",
            "https://*.agora.io",
            "wss://*.agora.io:*",
            "https://*.sd-rtn.com",
            "wss://*.sd-rtn.com:*"
        ],
      },
    },
  })
);


// 2. CORS Configuration for HTTP requests
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = ['https://movienightlive.netlify.app'];
    const isDevelopment = process.env.DEV_MODE === 'true';

    if (isDevelopment && (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1'))) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin) || !origin) {
      return callback(null, true);
    }

    return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'));
  }
}));

// 3. Rate Limiting
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api/', apiLimiter);

// Middleware
app.use(express.json());
const server = http.createServer(app);

// --- MongoDB Connection and Server Start ---
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
    const activeRooms = {};

    // --- Authentication Middleware (for HTTP Routes) ---
    const authenticateUser = async (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send('Unauthorized: No token provided');
      }
      const idToken = authHeader.split('Bearer ')[1];
      try {
        req.user = await admin.auth().verifyIdToken(idToken);
        next();
      } catch (error) {
        res.status(403).send('Unauthorized: Invalid token');
      }
    };

    const handleValidationErrors = (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        next();
    };

    // --- WebSocket Server with Improved Logic ---
    const wss = new WebSocketServer({ server });

    wss.on('connection', async (ws, req) => {
        const origin = req.headers.origin || 'no-origin';
        const isDevelopment = process.env.DEV_MODE === 'true';

        console.log(`\n--- [WebSocket] New Connection Attempt ---`);
        console.log(`> Origin: ${origin}`);
        console.log(`> DEV_MODE flag is set to: ${process.env.DEV_MODE}`);
        console.log(`> Server is in Development Mode: ${isDevelopment}`);

        // Origin check is now handled by Helmet's CSP and CORS for HTTP, this is a fallback log
        if (isDevelopment) {
            console.log(`[WebSocket INFO] Development mode detected.`);
        }

        try {
            const { query } = url.parse(req.url, true);
            const token = query.token;
            if (!token) {
                console.error('[WebSocket REJECT] No token provided.');
                return ws.terminate();
            }

            const user = await admin.auth().verifyIdToken(token);
            console.log(`[WebSocket SUCCESS] Token validated for user: ${user.uid}`);

            const roomCode = query.roomCode;
            if (!roomCode) {
                console.error('[WebSocket REJECT] No room code provided.');
                return ws.terminate();
            }

            ws.roomCode = roomCode;
            if (!activeRooms[roomCode]) activeRooms[roomCode] = new Set();
            activeRooms[roomCode].add(ws);

            const room = await roomsCollection.findOne({ roomCode });
            if (room) ws.send(JSON.stringify({ type: 'sync-state', state: room.state }));

            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message);
                    const allowedTypes = ['play', 'pause', 'seek'];
                    if (!allowedTypes.includes(data.type) || (data.time !== undefined && typeof data.time !== 'number')) return;

                    const newState = {
                        isPlaying: data.type === 'play',
                        currentTime: data.time,
                        lastUpdated: Date.now()
                    };
                    await roomsCollection.updateOne({ roomCode: ws.roomCode }, { $set: { state: newState } });
                    activeRooms[ws.roomCode].forEach(client => {
                        if (client !== ws && client.readyState === ws.OPEN) client.send(JSON.stringify(data));
                    });
                } catch (e) { console.error('WS message error:', e); }
            });

            ws.on('close', () => {
                if (ws.roomCode && activeRooms[ws.roomCode]) {
                    activeRooms[ws.roomCode].delete(ws);
                    if (activeRooms[ws.roomCode].size === 0) delete activeRooms[ws.roomCode];
                }
                console.log(`[WebSocket INFO] Client disconnected from room: ${ws.roomCode}`);
            });

        } catch (e) {
            console.error(`[WebSocket REJECT] Token is invalid or expired: ${e.message}`);
            return ws.terminate();
        }
    });

    // --- API Routes ---
    app.get('/', (req, res) => res.status(200).json({ message: 'Server is awake!' }));

    app.get('/api/agora-appid', authenticateUser, (req, res) => {
        const agoraAppId = process.env.AGORA_APP_ID;
        if (agoraAppId) res.json({ agoraAppId });
        else res.status(500).json({ message: 'An internal server error occurred.' });
    });

    app.get('/api/firebase-config', (req, res) => {
      const firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET_WEB,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
      };
      res.json(firebaseConfig);
    });

    app.put('/api/movies/:movieId', authenticateUser, [
        param('movieId').isMongoId(),
        body('newName').notEmpty().trim().escape()
    ], handleValidationErrors, async (req, res) => {
        try {
            const { movieId } = req.params;
            const { newName } = req.body;
            const result = await moviesCollection.updateOne({ _id: new ObjectId(movieId), userId: req.user.uid }, { $set: { fileName: newName } });
            if (result.matchedCount === 0) return res.status(404).json({ message: 'Movie not found or user not authorized' });
            res.status(200).json({ message: 'Movie renamed successfully' });
        } catch (error) {
            console.error("❌ Failed to rename movie:", error);
            res.status(500).json({ message: 'An internal server error occurred.' });
        }
    });

    app.post('/api/generate-upload-url', authenticateUser, [
        body('fileName').notEmpty().trim().escape(),
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
            console.error("Error generating stream URL:", error);
            res.status(500).json({ message: 'An internal server error occurred.' });
        }
    });

    app.get('/api/movies/:userId', authenticateUser, [param('userId').isString()], handleValidationErrors, async (req, res) => {
        if (req.params.userId !== req.user.uid) return res.status(403).json({ message: 'Forbidden' });
        const movies = await moviesCollection.find({ userId: req.params.userId }).toArray();
        res.status(200).json(movies);
    });

    app.delete('/api/movies/:movieId', authenticateUser, [
        param('movieId').isMongoId()
    ], handleValidationErrors, async (req, res) => {
        try {
            const { movieId } = req.params;
            const movie = await moviesCollection.findOne({ _id: new ObjectId(movieId), userId: req.user.uid });
            if (!movie) return res.status(404).json({ message: 'Movie not found or user not authorized' });
            await bucket.file(movie.filePath).delete();
            await moviesCollection.deleteOne({ _id: new ObjectId(movieId) });
            res.status(200).json({ message: 'Movie deleted successfully' });
        } catch (error) {
            console.error('Error deleting movie:', error);
            res.status(500).json({ message: 'An internal server error occurred.' });
        }
    });

    app.post('/api/rooms', authenticateUser, [
        body('roomCode').isLength({ min: 6, max: 6 }).isAlphanumeric().trim(),
        body('fileId').isURL(),
        body('fileName').notEmpty().trim().escape(),
        body('filePath').notEmpty().trim()
    ], handleValidationErrors, async (req, res) => {
        const { roomCode, fileId, fileName, filePath } = req.body;
        const existingMovie = await moviesCollection.findOne({ filePath, userId: req.user.uid });
        if (!existingMovie) {
            await moviesCollection.insertOne({ userId: req.user.uid, fileName, publicUrl: fileId, filePath, createdAt: new Date() });
        }
        const newRoom = { roomCode, fileId, createdAt: new Date(), state: { isPlaying: false, currentTime: 0, lastUpdated: Date.now() } };
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