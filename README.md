# Movie Night

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Live Demo:** [https://movienightlive.netlify.app/](https://movienightlive.netlify.app/)

Movie Night is a web application that allows users to watch movies together in synchronized real-time, no matter where they are. Host a room, share the code, and enjoy a shared viewing experience with friends and family, complete with video chat.

### Table of Contents

1.  [About The Project](#about-the-project)
2.  [Built With](#built-with)
3.  [Getting Started](#getting-started)
    * [Prerequisites](#prerequisites)
    * [Installation](#installation)
4.  [Features](#features)
5.  [Project Structure](#project-structure)
6.  [License](#license)
7.  [Contact](#contact)

---

## About The Project

**Movie Night** is a web-based application designed for users to watch movies together in synchronized real-time. The primary use-case is for a "host" to upload a movie and create a private, invite-only room.

Participants can join with a unique room code and enjoy a shared viewing experience with video and audio chat, creating a virtual movie night with friends and family.

## Built With

This project leverages a modern and robust technology stack for both the frontend and backend.

**Frontend:**
* ![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
* ![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
* ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css)
* ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

**Backend:**
* ![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js)
* ![Express.js](https://img.shields.io/badge/Express.js-000000?logo=express)
* ![WebSocket](https://img.shields.io/badge/WebSocket-010101?logo=gnometerminal&logoColor=white)

**Database:**
* ![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?logo=mongodb&logoColor=white)

**Services:**
* ![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase) (Authentication & Cloud Storage)
* ![Agora](https://img.shields.io/badge/Agora-099DFD?logo=agora&logoColor=white) (RTC for Video & Audio Chat)

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

You need to have Node.js and npm installed on your machine.

You will also need to set up accounts for:
* **Firebase:** To handle user authentication and Cloud Storage.
* **MongoDB:** For the database.
* **Agora:** To get your App ID for video chat.

### Installation

1.  **Clone the repo**
    ```sh
    git clone [https://github.com/harshithkdev/movie-night.git](https://github.com/harshithkdev/movie-night.git)
    cd movie-night
    ```

2.  **Install backend dependencies**
    ```sh
    cd backend
    npm install
    ```

3.  **Configure Environment Variables**

    Create a `.env` file in the `/backend` directory:
    ```env
    PORT=3000
    MONGO_URI="your_mongodb_connection_string"
    FIREBASE_STORAGE_BUCKET="your_firebase_storage_bucket_url"
    AGORA_APP_ID="your_agora_app_id"
    # Firebase Service Account Credentials (as a single line of JSON)
    FIREBASE_SERVICE_ACCOUNT='{"type": "service_account", "project_id": "...", ...}'
    ```
    *Note: `FIREBASE_SERVICE_ACCOUNT` should be the JSON content of your Firebase service account key, usually as a single line.*

4.  **Run the application**

    To run the backend server:
    ```sh
    cd backend
    npm start
    ```
    Open the `index.html` file in your browser. Using a live server extension is recommended.

## Features

* **User Authentication:** Secure sign-up and login to manage a personal movie library.
* **Host & Join Rooms:** Easily host a movie session by uploading a video, which generates a unique room code to share.
* **Real-time Video Synchronization:** Movie playback is perfectly synchronized for all participants. Play, pause, and seek actions are reflected instantly for everyone in the room.
* **Live Video Chat:** Communicate with friends in the room via video and audio chat, powered by Agora.
* **Personal Movie Library:** Registered users have a personal library to store, rename, and delete their uploaded movies.
* **Cloud Storage:** Movies are securely uploaded to and streamed from Firebase Cloud Storage for reliable playback.
* **Responsive Design:** A beautiful and intuitive interface that works on all devices.

## Project Structure

The project has a clear separation between the frontend and backend code.
```
/
├── backend/                # Node.js & Express Backend
│   ├── server.js           # API endpoints and WebSocket logic
│   └── package.json
│
├── html/                   # HTML files for different pages
│   ├── host.html
│   ├── join.html
│   └── watch.html
│
├── js/                     # Frontend JavaScript files
│   ├── auth.js
│   ├── host.js
│   ├── join.js
│   ├── videocall.js
│   └── watch.js
│
├── index.html              # Main entry point for the frontend
└── package.json            # Frontend development dependencies
```
## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

Harshith K - harshithkotian999@gmail.com

Project Link: [https://github.com/harshithkdev/movie-night](https://github.com/harshithkdev/movie-night)