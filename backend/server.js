import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import conversationRoutes from './routes/conversations.js';
import messageRoutes, { setSocketIO as setMessageSocketIO } from './routes/messages.js';
import friendRoutes, { setIO as setFriendsSocketIO } from './routes/friends.js';
import fileRoutes from './routes/files.js';
import voteRoutes from './routes/votes.js';
import aiRoutes from './routes/ai.js';
import deadlineRoutes from './routes/deadlines.js';
import { setupSocketIO } from './socket/socket.js';
import { authenticateSocket } from './middleware/auth.js';
import { startDeadlineReminderScheduler } from './services/deadline-reminder.service.js';

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Check required environment variables
if (!process.env.JWT_SECRET) {
  console.error('❌ ERROR: JWT_SECRET is not set in environment variables');
  console.error('Please create a .env file with JWT_SECRET or set it as an environment variable');
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
connectDB();

// Make io accessible to routes via req.app.get('io')
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/deadlines', deadlineRoutes);

// Setup Socket.IO
io.use(authenticateSocket);
setupSocketIO(io);

// Pass io instance to routes that need it
setMessageSocketIO(io);
setFriendsSocketIO(io);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'QuickPing API is running' });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Start deadline reminder scheduler
  startDeadlineReminderScheduler();
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    console.error('Please kill the process using this port or change PORT in .env file');
    console.error(`Run: lsof -ti:${PORT} | xargs kill -9`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', err);
    process.exit(1);
  }
});

export { io };

