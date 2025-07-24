require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');

const app = express();
const port = 3000;

// --- NEW: Final, Most Robust CORS Configuration ---
// This configuration explicitly handles all types of cross-origin requests,
// including the browser's "preflight" OPTIONS requests, which is the
// likely source of the problem.
app.use(cors());
// --- END NEW ---

// Middleware
app.use(express.json()); // Allows the server to read JSON from requests

// MongoDB Client Setup
const client = new MongoClient(process.env.MONGO_URI, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    console.log("Successfully connected to MongoDB Atlas!");
    
    const db = client.db("movieNightDB"); // Your database name
    const roomsCollection = db.collection("rooms"); // Your collection name

    // API Endpoint to create a new room
    app.post('/api/rooms', async (req, res) => {
      const { roomCode, fileId } = req.body;
      if (!roomCode || !fileId) {
        return res.status(400).json({ message: 'roomCode and fileId are required' });
      }
      try {
        const newRoom = { roomCode, fileId, createdAt: new Date() };
        await roomsCollection.insertOne(newRoom);
        res.status(201).json(newRoom);
      } catch (error) {
        res.status(500).json({ message: 'Failed to create room', error });
      }
    });

    // API Endpoint to get a room's fileId
    app.get('/api/rooms/:roomCode', async (req, res) => {
      const { roomCode } = req.params;
      // --- THIS IS THE NEW DIAGNOSTIC LINE ---
      console.log(`[${new Date().toISOString()}] Received request to find room: ${roomCode}`);
      try {
        const room = await roomsCollection.findOne({ roomCode });
        if (room) {
          console.log(`... Found room ${roomCode} in database.`);
          res.status(200).json({ fileId: room.fileId });
        } else {
          console.log(`... Could NOT find room ${roomCode} in database.`);
          res.status(404).json({ message: 'Room not found' });
        }
      } catch (error) {
        console.error(`... Error while finding room ${roomCode}:`, error);
        res.status(500).json({ message: 'Failed to find room', error });
      }
    });

    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });

  } catch(err) {
    console.error("Failed to connect to MongoDB", err);
  }
}

run();
