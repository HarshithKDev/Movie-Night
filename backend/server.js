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
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
};
app.use(cors(corsOptions));

// 2. Rate Limiting
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per windowMs
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
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
            info.req.user = decodedToken;
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


// NEW: Health check route for the keep-alive service
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Server is awake and running!' });
});

const rooms = {};
wss.on('connection', (ws, req) => {
    const { query } = url.parse(req.url, true);
    const roomCode = query.roomCode;
    
    if (!roomCode) {
        ws.close(1008, 'Room code is required');
        return;
    }

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

// Helper to handle validation results
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

    app.put('/api/movies/:movieId', 
        authenticateUser, 
        [
            param('movieId').isMongoId().withMessage('Invalid movie ID format'),
            body('newName').notEmpty().trim().escape().withMessage('New name cannot be empty')
        ],
        handleValidationErrors,
        async (req, res) => {
            const { movieId } = req.params;
            const { newName } = req.body;
            const userId = req.user.uid;

            try {
                const result = await moviesCollection.updateOne(
                    { _id: new ObjectId(movieId), userId: userId },
                    { $set: { fileName: newName } }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).json({ message: 'Movie not found or user not authorized' });
                }
                
                res.status(200).json({ message: 'Movie renamed successfully' });
            } catch (error) {
                console.error("❌ Failed to rename movie", error);
                res.status(500).json({ message: 'Failed to rename movie' });
            }
        }
    );

    app.post('/api/generate-upload-url', 
        authenticateUser,
        [
            body('fileName').notEmpty().trim(),
            body('fileType').equals('video/mp4').withMessage('Only MP4 files are allowed')
        ],
        handleValidationErrors,
        async (req, res) => {
            const { fileName, fileType } = req.body;

            // **FIX:** Sanitize the filename to create a safe path
            const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            const filePath = `videos/${Date.now()}-${sanitizedFileName}`;
            
            const file = bucket.file(filePath);
            const options = { version: 'v4', action: 'write', expires: Date.now() + 15 * 60 * 1000, contentType: fileType };
            
            try {
                const [signedUrl] = await file.getSignedUrl(options);
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
                res.status(200).json({ signedUrl, publicUrl, filePath });
            } catch (error) { 
                console.error("Error generating upload URL:", error);
                res.status(500).json({ message: 'Could not generate upload URL' }); 
            }
        }
    );

    app.post('/api/get-stream-url', 
        authenticateUser,
        [
            body('publicUrl').isURL().withMessage('Invalid URL format')
        ],
        handleValidationErrors,
        async (req, res) => {
            const { publicUrl } = req.body;
            try {
                const urlParts = new URL(publicUrl);
                const filePath = urlParts.pathname.substring(1).split('/').slice(1).join('/');
                const file = bucket.file(filePath);
                const options = { version: 'v4', action: 'read', expires: Date.now() + 60 * 60 * 1000 };
                const [streamUrl] = await file.getSignedUrl(options);
                res.status(200).json({ streamUrl });
            } catch (error) { 
                console.error("Error generating stream URL:", error);
                res.status(500).json({ message: 'Could not generate stream URL' }); 
            }
        }
    );

    app.get('/api/movies/:userId', 
        authenticateUser,
        [
            param('userId').isString().withMessage('Invalid user ID')
        ],
        handleValidationErrors,
        async (req, res) => {
            const { userId } = req.params;
            if (userId !== req.user.uid) {
                return res.status(403).json({ message: 'Forbidden' });
            }
            const movies = await moviesCollection.find({ userId }).toArray();
            res.status(200).json(movies);
        }
    );

    app.delete('/api/movies', 
        authenticateUser,
        [
            body('movieId').isMongoId().withMessage('Invalid movie ID format'),
            body('filePath').notEmpty().withMessage('File path is required')
        ],
        handleValidationErrors,
        async (req, res) => {
            const { movieId, filePath } = req.body;
            const userId = req.user.uid;

            const movie = await moviesCollection.findOne({ _id: new ObjectId(movieId), userId });
            if (!movie) return res.status(404).json({ message: 'Movie not found or user not authorized' });
            
            try {
                await bucket.file(filePath).delete();
                await moviesCollection.deleteOne({ _id: new ObjectId(movieId) });
                res.status(200).json({ message: 'Movie deleted successfully' });
            } catch (error) {
                console.error('Error deleting movie:', error);
                res.status(500).json({ message: 'Error deleting movie file' });
            }
        }
    );

    app.post('/api/rooms', 
        authenticateUser,
        [
            body('roomCode').isLength({ min: 6, max: 6 }).isAlphanumeric().trim(),
            body('fileId').isURL(),
            body('fileName').notEmpty().trim(),
            body('filePath').notEmpty().trim()
        ],
        handleValidationErrors,
        async (req, res) => {
            const { roomCode, fileId, fileName, filePath } = req.body;
            const userId = req.user.uid;
            
            // **FIX:** Prevent duplicate movie entries
            const existingMovie = await moviesCollection.findOne({ filePath: filePath, userId: userId });
            if (!existingMovie) {
                await moviesCollection.insertOne({ userId, fileName, publicUrl: fileId, filePath, createdAt: new Date() });
            }

            const newRoom = { roomCode, fileId, createdAt: new Date() };
            await roomsCollection.insertOne(newRoom);
            res.status(201).json(newRoom);
        }
    );

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