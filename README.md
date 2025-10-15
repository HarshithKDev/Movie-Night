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
    MONGO_URI="your_mongodb_connection_string"
    FIREBASE_STORAGE_BUCKET="your_firebase_storage_bucket_url"
    AGORA_APP_ID="YOUR_AGORA_APP_ID"
    # Firebase Service Account Credentials (as a single line of JSON)
    FIREBASE_SERVICE_ACCOUNT='{"type": "service_account", "project_id": "...", ...}'
    ```
    **IMPORTANT:** The `FIREBASE_SERVICE_ACCOUNT` variable should contain the entire content of your `firebase-service-account-key.json` file as a single line of JSON. This file is listed in `.gitignore` and **should never be committed to version control**.

### Usage

1.  **Start the backend server:**
    ```sh
    cd backend
    npm start
    ```
2.  **Open the frontend:**
    Open the `index.html` file in your browser. Using a live server extension (like the one in VS Code) is recommended.