# Movie Night

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Live Demo:** [https://movienightlive.netlify.app/](https://movienightlive.netlify.app/)

Movie Night is a web application that allows users to watch movies together in synchronized real-time, no matter where they are. Host a room, share the code, and enjoy a shared viewing experience with friends and family, complete with video chat.

## Features

* **User Authentication:** Secure sign-up and login to manage a personal movie library.
* **Host & Join Rooms:** Easily host a movie session by uploading a video, which generates a unique room code to share.
* **Real-time Video Synchronization:** Movie playback is perfectly synchronized for all participants. Play, pause, and seek actions are reflected instantly for everyone in the room.
* **Live Video Chat:** Communicate with friends in the room via video and audio chat, powered by Agora.
* **Personal Movie Library:** Registered users have a personal library to store, rename, and delete their uploaded movies.
* **Cloud Storage:** Movies are securely uploaded to and streamed from Firebase Cloud Storage for reliable playback.
* **Responsive Design:** A beautiful and intuitive interface that works on all devices.

## Technologies Used

### Frontend:

* HTML5
* CSS3
* [Tailwind CSS](https://tailwindcss.com/)
* JavaScript

### Backend:

* [Node.js](https://nodejs.org/)
* [Express.js](https://expressjs.com/)
* [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

### Database:

* [MongoDB](https://www.mongodb.com/)

### Services:

* **Authentication & Storage:** [Firebase (Authentication, Cloud Storage)](https://firebase.google.com/)
* **Video & Audio Chat:** [Agora RTC](https://www.agora.io/en/)

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

* Node.js and npm
* A [Firebase](https://firebase.google.com/) account for Authentication and Storage.
* A [MongoDB](https://www.mongodb.com/) account for the database.
* An [Agora](https://www.agora.io/) developer account for the video chat App ID.

### Installation

1.  **Clone the repository**
    ```sh
    git clone [https://github.com/your_username/movie-night.git](https://github.com/your_username/movie-night.git)
    cd movie-night
    ```
2.  **Install backend dependencies**
    ```sh
    cd backend
    npm install
    ```
3.  **Set up Backend Environment Variables**
    Create a `.env` file in the `backend` directory and add your credentials:
    ```env
    PORT=3000
    MONGO_URI=your_mongodb_connection_string
    FIREBASE_SERVICE_ACCOUNT=your_firebase_service_account_json_as_a_single_line
    FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket_url
    ```
4.  **Configure Frontend Firebase Keys**
    In `js/auth.js`, replace the placeholder `firebaseConfig` with your actual Firebase project's web app configuration.
    ```javascript
    const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_STORAGE_BUCKET",
      messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
      appId: "YOUR_APP_ID"
    };
    ```
5.  **Configure Frontend Agora App ID**
    In `js/videocall.js`, replace the placeholder `AGORA_APP_ID` with your Agora App ID.
    ```javascript
    const AGORA_APP_ID = 'YOUR_AGORA_APP_ID';
    ```

### Usage

1.  **Start the backend server:**
    ```sh
    cd backend
    npm start
    ```
2.  **Open the frontend:**
    Open the `index.html` file in your browser. Using a live server extension (like the one in VS Code) is recommended for the best development experience.

## Project Structure

* `index.html`: The main landing page with user authentication (login/signup).
* `host.html` & `js/host.js`: The page for authenticated users to upload new movies or select from their library to host a new session.
* `join.html` & `js/join.js`: The page where users can enter a room code to join a session.
* `watch.html` & `js/watch.js`: The main watch party room, featuring the synchronized video player and the participant video chat sidebar.
* `backend/server.js`: The core Node.js server using Express for API routes, MongoDB for data persistence, and WebSockets for real-time synchronization.
* `js/auth.js`: Handles all Firebase authentication logic.
* `js/videocall.js`: Manages the Agora video and audio chat functionality.
* `output.css`: The compiled Tailwind CSS file.