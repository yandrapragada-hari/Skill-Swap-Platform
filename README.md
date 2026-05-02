# Skill Swap Platform

A full-stack peer-to-peer skill exchange platform where users can teach skills they know and learn skills they need from other users.

## Features

- **User Authentication** — Secure login/registration with JWT
- **Skill Matching** — Find users with complementary skills
- **Real-time Messaging** — Socket.io powered chat
- **Video Calls** — In-app video calling capability *(in progress)*
- **User Profiles** — Manage your skills, bio, and availability
- **Connections** — Build your skill exchange network

## Tech Stack

| Layer | Technology |
|-------|-------------|
| Frontend | React, React Router, Vite |
| Backend | Node.js, Express |
| Database | MongoDB with Mongoose |
| Real-time | Socket.io |
| Styling | Bootstrap + Custom CSS |

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (local or Atlas)

### Installation

```bash
# Clone the repository
git clone https://github.com/yandrapragada-hari/Skill-Swap-Platform.git
cd Skill-Swap-Platform

# Install all dependencies
npm run install:all
```

### Configuration

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/skillswap
JWT_SECRET=your_secret_key_here
```

### Running the App

```bash
# Run both frontend and backend
npm run dev

# Or run separately:
npm run start:backend  # Backend on http://localhost:5000
npm run start:frontend # Frontend on http://localhost:5173
```

## Project Structure

```
skill swap/
├── backend/
│   ├── config/       # Database configuration
│   ├── controllers/  # Route handlers
│   ├── middleware/   # Auth middleware
│   ├── models/       # Mongoose schemas
│   ├── routes/       # API routes
│   ├── server.js     # Express setup
│   └── socket.js     # Socket.io handlers
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── context/     # React context (Auth)
│   │   ├── pages/       # Page components
│   │   ├── services/    # API & Socket services
│   │   └── App.jsx      # Main app component
│   └── index.html
└── package.json      # Root scripts
```

## API Endpoints

### Auth
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login user
- `GET /api/auth/me` — Get current user

### Users
- `GET /api/users` — List all users
- `GET /api/users/:id` — Get user by ID
- `PUT /api/users/:id` — Update user profile

### Connections
- `POST /api/connections` — Send connection request
- `GET /api/connections` — Get user's connections
- `PUT /api/connections/:id` — Accept/Decline request

### Messages
- `GET /api/messages/:connectionId` — Get conversation
- `POST /api/messages` — Send message


## In Progress

### Video Calls
- **VideoCallOverlay component** — UI overlay for call interface
- **Socket events** — Signaling for call initiation/termination
- **Pending:** WebRTC integration for peer-to-peer streaming