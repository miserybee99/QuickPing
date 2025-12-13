# QuickPing - Chat Platform for Students & Teachers

A modern real-time chat platform designed for educational institutions, built with Next.js, Express.js, MongoDB, and Socket.io.

## Project Structure

```
quickping/
├── backend/          # Express.js + MongoDB + Socket.io
└── frontend/         # Next.js 15 + Shadcn UI + TypeScript
```

## Tech Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB Atlas
- **Real-time:** Socket.io
- **Authentication:** JWT (JSON Web Tokens)
- **Validation:** Express Validator

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Library:** Shadcn UI
- **Icons:** Lucide React
- **HTTP Client:** Axios
- **Real-time:** Socket.io Client

## Features

### ✅ Completed
- User authentication (register/login/logout)
- Email validation
- JWT-based authentication
- MongoDB database setup
- Socket.io real-time connection
- Modern 3-column chat UI
- Responsive design
- Shadcn UI components integration

### 🚧 In Progress
- Message sending/receiving
- File upload/download
- User search
- Friend requests
- Group chat creation
- Online/offline status

### 📋 Planned
- Reply-to-message & threads
- Message reactions
- Pin messages
- Edit messages
- Voting in groups
- AI summarize
- Dark mode
- Profile customization

## Quick Start

### 🐳 Docker Quick Start (Recommended)

The easiest way to run the entire application is using Docker Compose:

#### Prerequisites
- Docker & Docker Compose installed
- MongoDB Atlas connection string (or use local MongoDB)

#### Setup

1. **Create `.env` file in root directory:**
```bash
# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/quickping?retryWrites=true&w=majority

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

2. **Start all services:**
```bash
docker-compose up -d
```

3. **Access the application:**
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5001
- **MongoDB**: localhost:27017 (if using local MongoDB)

#### Useful Commands

```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild (when code changes)
docker-compose up -d --build

# View status
docker-compose ps

# Restart a service
docker-compose restart backend

# View logs of a specific service
docker-compose logs -f backend

# Enter container
docker exec -it quickping-backend sh
docker exec -it quickping-frontend sh
docker exec -it quickping-mongodb mongosh

# Stop and remove all (including data)
docker-compose down -v
```

### 📦 Manual Setup

#### Prerequisites
- Node.js 18+ 
- MongoDB Atlas account (or local MongoDB)
- npm or yarn

#### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOL
PORT=5001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
EOL

# Run backend
npm run dev
```

Backend will run on **http://localhost:5001**

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run frontend
npm run dev
```

Frontend will run on **http://localhost:3000**

## Environment Variables

### Backend (.env)
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/quickping  # or MongoDB Atlas URI
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
NODE_ENV=development

# Cloudinary (Optional for dev, Required for production)
# Get credentials from: https://cloudinary.com/console
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### File Storage

QuickPing supports two storage modes:
- **Local Storage** (default): Files saved to `backend/uploads/`
- **Cloudinary** (recommended for production): Files uploaded to Cloudinary CDN

When `CLOUDINARY_*` env vars are set, Cloudinary is automatically used. Otherwise, falls back to local storage.

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5001
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/search/:query` - Search users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/profile` - Update profile
- `PUT /api/users/preferences` - Update preferences

### Conversations
- `GET /api/conversations` - Get user conversations
- `POST /api/conversations/direct` - Create direct chat
- `POST /api/conversations/group` - Create group chat

### Messages
- `GET /api/messages/conversation/:id` - Get conversation messages
- `POST /api/messages` - Send message
- `PUT /api/messages/:id` - Edit message
- `POST /api/messages/:id/read` - Mark as read

## Socket.io Events

### Client → Server
- `join_conversation` - Join conversation room
- `leave_conversation` - Leave conversation room
- `new_message` - Send new message
- `typing` - User typing
- `stop_typing` - User stopped typing
- `message_read` - Mark message as read

### Server → Client
- `message_received` - New message received
- `user_typing` - User is typing
- `user_stopped_typing` - User stopped typing
- `user_status_changed` - Online/offline status changed
- `read_receipt` - Message read receipt

## Database Schema

### Collections
- **users** - User accounts
- **conversations** - Chat conversations
- **messages** - Chat messages
- **schools** - Educational institutions
- **friendships** - Friend relationships
- **files** - Uploaded files
- **votes** - Group votes
- **notifications** - User notifications
- **user_sessions** - Active sessions

## Development

### Backend
```bash
cd backend
npm run dev      # Run with nodemon (auto-reload)
npm start        # Run production
```

### Frontend
```bash
cd frontend
npm run dev      # Development server
npm run build    # Build for production
npm start        # Production server
```

## Testing

📖 **Xem hướng dẫn test API chi tiết tại:** [`API_TESTING_GUIDE.md`](./API_TESTING_GUIDE.md)

### Quick Test Methods

#### Method 1: Test Script (Recommended)
```bash
cd backend
npm run test-api              # Test all endpoints
npm run test-api auth         # Test only auth endpoints
npm run test-api messages     # Test only messages endpoints
```

#### Method 2: Quick cURL Examples

**Register User**
```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'
```

**Login**
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### Method 3: Postman Collection
Import file [`QuickPing_API.postman_collection.json`](./QuickPing_API.postman_collection.json) vào Postman để test tất cả endpoints.

### Health Check
```bash
curl http://localhost:5001/health
```

## UI Screenshots

### 3-Column Layout
- **Left:** Messages list with search, tags, badges
- **Center:** Chat window with messages and input
- **Right:** Directory with team members and files

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## License

This project is licensed under the MIT License.

## Authors

- **Nhóm 4** - QuickPing Development Team

## Acknowledgments

- Shadcn UI for beautiful components
- Next.js team for amazing framework
- MongoDB Atlas for database hosting
- Socket.io for real-time capabilities
