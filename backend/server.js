require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Create a standard HTTP server from the Express app
const server = http.createServer(app);

// Create a WebSocket server and attach it to the HTTP server
const wss = new WebSocketServer({ server });

// This object will store all connected clients, organized by room code
const rooms = {};

wss.on('connection', (ws) => {
  console.log('Client connected via WebSocket');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // When a user first connects, they will send a 'join' event
      if (data.type === 'join') {
        const { roomCode } = data;
        ws.roomCode = roomCode; // Attach the room code to the WebSocket connection object

        // If the room doesn't exist, create it
        if (!rooms[roomCode]) {
          rooms[roomCode] = new Set();
        }
        // Add the new client to the room
        rooms[roomCode].add(ws);
        console.log(`Client joined room: ${roomCode}. Total clients in room: ${rooms[roomCode].size}`);
      }

      // When a client sends a playback event (play, pause, seek)
      if (['play', 'pause', 'seek'].includes(data.type)) {
        const { roomCode } = ws;
        if (rooms[roomCode]) {
          // Broadcast the message to all other clients in the same room
          rooms[roomCode].forEach(client => {
            // We only send to other clients, not the one who sent the message
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
      // Remove the client from the room when they disconnect
      rooms[roomCode].delete(ws);
      console.log(`Client left room: ${roomCode}. Total clients in room: ${rooms[roomCode].size}`);
      if (rooms[roomCode].size === 0) {
        delete rooms[roomCode]; // Clean up empty rooms
      }
    }
    console.log('Client disconnected');
  });
});

// MongoDB Client Setup
const client = new MongoClient(process.env.MONGO_URI, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

async function run() {
  try {
    await client.connect();
    console.log("Successfully connected to MongoDB Atlas!");
    
    const db = client.db("movieNightDB");
    const roomsCollection = db.collection("rooms");

    // API Endpoints (these remain the same)
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

    // Start the server
    server.listen(port, "0.0.0.0", () => {
      console.log(`Server listening on port ${port}`);
    });

  } catch(err) {
    console.error("Failed to connect to MongoDB", err);
  }
}

run();
