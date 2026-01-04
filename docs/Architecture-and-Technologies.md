# QuickPing - Analysis and Design: Architecture and Technologies

## 1. Tổng quan Kiến trúc (Architecture Overview)

QuickPing được thiết kế theo mô hình **3-Tier Architecture** (Kiến trúc 3 tầng) - một kiến trúc phổ biến và hiệu quả cho các ứng dụng web hiện đại:

- **Tier 1 - Presentation Layer**: Frontend (Next.js) - Xử lý giao diện người dùng
- **Tier 2 - Business Logic Layer**: Backend (Express.js) - Xử lý nghiệp vụ và API
- **Tier 3 - Data Layer**: Database (MongoDB) - Lưu trữ dữ liệu

**Code Organization**: Project được tổ chức theo cấu trúc **Distributed Monorepo** - tất cả code trong một repository nhưng deploy riêng biệt cho từng tier.

### 1.1 Kiến trúc 3-Tier Tổng thể

```
┌─────────────────────────────────────────────────────────┐
│                    QuickPing System                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐              ┌──────────────┐       │
│  │   Frontend   │              │    Backend   │       │
│  │   (Next.js)  │ ◄──HTTP/REST──► │  (Express)  │       │
│  │              │              │              │       │
│  │ Port: 3000   │              │ Port: 5001   │       │
│  └──────────────┘              └──────────────┘       │
│         │                              │              │
│         │                              │              │
│         └────────WebSocket/Socket.io───┘              │
│                              │                        │
│                              ▼                        │
│                    ┌──────────────┐                  │
│                    │   MongoDB    │                  │
│                    │    Atlas     │                  │
│                    │  (Database)  │                  │
│                    └──────────────┘                  │
│                              │                        │
│         ┌────────────────────┼────────────────────┐  │
│         ▼                    ▼                    ▼  │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐ │
│  │Cloudinary│      │  Gemini  │      │   SMTP   │ │
│  │ (Files)  │      │    AI    │      │  (Email) │ │
│  └──────────┘      └──────────┘      └──────────┘ │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 1.2 Chi tiết các Tier trong 3-Tier Architecture

**TIER 1 - Presentation Layer (Frontend):**
- **Framework**: Next.js 15 với React 19
- **UI Components**: React components với Shadcn UI
- **State Management**: React Context API (Socket, Theme, User Status)
- **Routing**: Next.js App Router (File-based routing)
- **API Communication**: Axios client với interceptors
- **Real-time**: Socket.io client integration
- **Styling**: Tailwind CSS với responsive design

**TIER 2 - Business Logic Layer (Backend):**
- **Framework**: Express.js với Node.js
- **Controller Layer**: Express routes (RESTful API endpoints)
- **Business Logic**: Route handlers & service modules
- **Data Access**: Mongoose ODM với MongoDB schemas
- **Real-time Communication**: Socket.io server với room management
- **Authentication**: JWT middleware & OAuth integration
- **External Services**: Cloudinary, Gemini AI, SMTP services
- **Internal Pattern**: Layered Architecture (MVC) - tách biệt Controller, Service, Model

**TIER 3 - Data Layer (Database):**
- **Database**: MongoDB Atlas (NoSQL Document Database)
- **ODM**: Mongoose cho object modeling
- **Storage**: Document-based storage với flexible schema
- **Indexes**: Strategic indexing cho query optimization

### 1.3 Lợi ích của 3-Tier Architecture

✅ **Separation of Concerns**: Mỗi tier có trách nhiệm rõ ràng, tách biệt  
✅ **Independence**: Mỗi tier có thể phát triển, test, và deploy độc lập  
✅ **Scalability**: Scale từng tier theo nhu cầu (ví dụ: scale database riêng)  
✅ **Technology Flexibility**: Mỗi tier có thể chọn công nghệ phù hợp  
✅ **Maintainability**: Dễ bảo trì và debug khi có vấn đề ở một tier cụ thể  
✅ **Team Parallelism**: Team có thể làm việc song song trên các tier khác nhau  
✅ **Security**: Có thể áp dụng security policies khác nhau cho từng tier

### 1.4 Code Organization: Distributed Monorepo

Mặc dù kiến trúc tổng thể là 3-Tier, nhưng code được tổ chức trong **Monorepo** (một repository):

```
QuickPing/
├── frontend/     # Tier 1 (Presentation)
├── backend/      # Tier 2 (Business Logic)
└── docs/         # Documentation
```

**Lợi ích Monorepo:**
- ✅ Shared types và utilities giữa frontend/backend
- ✅ Single source of truth
- ✅ Easier cross-project refactoring
- ✅ Simplified dependency management

**Deployment Strategy: Distributed**
- Frontend → Vercel (tier 1)
- Backend → Render.com (tier 2)  
- Database → MongoDB Atlas (tier 3)

Đây là lý do gọi là "Distributed Monorepo" - code trong một repo nhưng deploy phân tán.

---

## 2. Backend Architecture (Kiến trúc Backend)

### 2.1 Technology Stack

**Runtime & Framework:**
- **Node.js**: Runtime environment (ES Modules)
- **Express.js 4.18**: Web framework cho RESTful API
- **Socket.io 4.6**: Real-time bidirectional communication

**Database & ORM:**
- **MongoDB Atlas**: Cloud NoSQL database (Document-based)
- **Mongoose 8.19**: Object-Document Mapping (ODM) layer

**Authentication & Security:**
- **JSON Web Tokens (JWT)**: Stateless authentication
- **bcryptjs 2.4**: Password hashing (bcrypt algorithm)
- **OAuth 2.0**: Google authentication integration
- **Express Validator**: Input validation & sanitization

**File Storage:**
- **Cloudinary 2.8**: Cloud-based media storage & CDN
- **Multer 1.4**: Multipart/form-data handling

**AI Integration:**
- **Google Generative AI (Gemini 2.5 Flash)**: Conversation summarization

**Email Services:**
- **Nodemailer 6.9**: SMTP email sending
- **SendGrid 8.1**: Alternative email service
- **Resend 6.6**: Modern email API
- **Brevo 3.0**: Transactional email service

### 2.2 Backend Structure

```
backend/
├── server.js                 # Entry point, Express app setup
├── config/                   # Configuration modules
│   ├── database.js          # MongoDB connection manager
│   ├── cloudinary.js        # Cloudinary SDK configuration
│   ├── gemini.js            # Google Gemini AI setup
│   └── passport.js          # OAuth authentication strategies
├── middleware/              # Cross-cutting concerns
│   └── auth.js             # JWT authentication middleware
├── models/                  # Mongoose schemas (Data Access)
│   ├── User.js             # User entity
│   ├── Message.js          # Message entity
│   ├── Conversation.js     # Conversation entity
│   ├── Friendship.js       # Friendship relationship
│   ├── File.js             # File metadata
│   ├── Vote.js             # Voting/poll entity
│   ├── Notification.js     # Notification entity
│   ├── OTP.js              # One-time password
│   ├── Deadline.js         # Deadline/calendar entity
│   ├── School.js           # Educational institution
│   └── UserSession.js      # Active session tracking
├── routes/                  # RESTful API endpoints (Controllers)
│   ├── auth.js             # Authentication routes
│   ├── users.js            # User management
│   ├── conversations.js    # Conversation management
│   ├── messages.js         # Message CRUD operations
│   ├── friends.js          # Friend request management
│   ├── files.js            # File upload/download
│   ├── votes.js            # Voting functionality
│   ├── ai.js               # AI-powered features
│   └── deadlines.js        # Deadline management
├── services/                # Business service layer
│   └── email.service.js    # Email sending service
├── socket/                  # Real-time communication
│   └── socket.js           # Socket.io event handlers
└── scripts/                 # Utility scripts
```

### 2.3 Backend Design Patterns

**1. MVC Pattern (Model-View-Controller):**
- **Models**: Mongoose schemas định nghĩa data structure
- **Controllers**: Express routes xử lý HTTP requests
- **Views**: JSON responses (RESTful API)

**2. Middleware Pattern:**
- Authentication middleware (`auth.js`) intercepts requests
- CORS middleware xử lý cross-origin requests
- Error handling middleware xử lý exceptions

**3. Service Layer Pattern:**
- Business logic tách biệt khỏi route handlers
- Reusable services (email service) cho nhiều use cases
- Separation of concerns

**4. Repository Pattern:**
- Mongoose models đóng vai trò repositories
- Abstraction layer giữa business logic và database

**5. Singleton Pattern:**
- Database connection được khởi tạo một lần
- Socket.io instance được share qua app

### 2.4 API Architecture

**RESTful API Design:**
- **GET** `/api/conversations` - Retrieve resources
- **POST** `/api/conversations` - Create resources
- **PUT** `/api/messages/:id` - Update resources
- **DELETE** `/api/messages/:id` - Delete resources

**Authentication Flow:**
```
Client → POST /api/auth/login
         ↓
Backend → Validate credentials
         ↓
         Generate JWT token
         ↓
Client ← { token, user }
         ↓
Client → Request với Header: Authorization: Bearer <token>
         ↓
Backend → auth.js middleware validates token
         ↓
         Attach user to req.user
         ↓
Route Handler → Process request
```

**Real-time Communication:**
```
Client → Socket.io Client connects with JWT token
         ↓
Backend → authenticateSocket middleware validates
         ↓
         Join user rooms & conversation rooms
         ↓
Client ← Receives real-time events (message_received, typing, etc.)
```

---

## 3. Frontend Architecture (Kiến trúc Frontend)

### 3.1 Technology Stack

**Framework & Runtime:**
- **Next.js 16**: React framework với App Router
- **React 19.2**: UI library (Latest version)
- **TypeScript 5.3**: Type-safe JavaScript

**Styling & UI:**
- **Tailwind CSS 3.3**: Utility-first CSS framework
- **Shadcn UI**: Component library built on Radix UI
- **Radix UI**: Unstyled, accessible component primitives
- **Framer Motion 12.23**: Animation library
- **Lucide React 0.552**: Icon library

**State Management:**
- **React Context API**: Global state (Socket, Theme, User Status)
- **React Hooks**: Local component state

**HTTP & Real-time:**
- **Axios 1.6**: HTTP client với interceptors
- **Socket.io Client 4.8**: Real-time WebSocket connection

**Additional Libraries:**
- **Emoji Picker React 4.10**: Emoji selection component
- **React Dropzone 14.3**: File upload with drag-and-drop
- **date-fns 2.30**: Date formatting utilities
- **class-variance-authority**: Component variant management

### 3.2 Frontend Structure

```
frontend/
├── app/                      # Next.js App Router (Pages)
│   ├── (chat)/              # Route group - Main chat interface
│   │   └── page.tsx         # Chat page
│   ├── auth/
│   │   ├── callback/        # OAuth callback handler
│   │   ├── login/           # Login page
│   │   ├── register/        # Registration page
│   │   ├── verify-email/    # Email verification
│   │   ├── forgot-password/ # Password recovery
│   │   └── reset-password/  # Password reset
│   ├── friends/             # Friends management
│   ├── groups/              # Group conversations
│   ├── files/               # File browser
│   ├── profile/             # User profile
│   ├── search/              # Global search
│   ├── settings/            # App settings
│   ├── layout.tsx           # Root layout wrapper
│   └── globals.css          # Global styles
├── components/              # Reusable React components
│   ├── ui/                 # Base UI components (Shadcn)
│   ├── chat/               # Chat-specific components
│   ├── auth/               # Authentication components
│   ├── modals/             # Modal dialogs
│   ├── navigation/         # Navigation components
│   ├── profile/            # Profile components
│   ├── file-upload/        # File upload UI
│   ├── reactions/          # Message reactions
│   ├── emoji/              # Emoji picker
│   └── layout/             # Layout components
├── contexts/               # React Context providers
│   ├── SocketContext.tsx   # WebSocket connection state
│   ├── ThemeContext.tsx    # Theme (light/dark) state
│   ├── SidebarContext.tsx  # UI layout state
│   └── UserStatusContext.tsx # Online/offline status
├── hooks/                  # Custom React hooks
│   ├── useDebounce.ts      # Debounce utility
│   └── useUser.ts          # User data hook
├── lib/                    # Utility libraries
│   ├── api-client.ts       # Typed API client
│   ├── api.ts              # Axios configuration
│   ├── file-utils.ts       # File utilities
│   ├── design-tokens.ts    # Design constants
│   └── utils.ts            # General utilities
└── types/                  # TypeScript type definitions
    └── index.ts            # Shared types
```

### 3.3 Frontend Design Patterns

**1. Component-Based Architecture:**
- Reusable, composable React components
- Separation of concerns (UI components vs business logic)
- Props-based communication

**2. Context API Pattern:**
- Global state management without external libraries
- Providers wrap application (Socket, Theme, User Status)
- Consumers access state via hooks

**3. Custom Hooks Pattern:**
- Reusable stateful logic extraction
- `useSocket`, `useUser`, `useDebounce`
- Separation of concerns

**4. Container/Presentational Pattern:**
- Container components handle logic & data fetching
- Presentational components handle UI rendering
- Clear separation of responsibilities

**5. Composition Pattern:**
- Small, focused components composed into larger features
- Shadcn UI components built with composition

### 3.4 Next.js 15 App Router Features

**File-based Routing:**
- Routes automatically created from `app/` directory structure
- Route groups `(chat)` organize without affecting URL
- Dynamic routes `[id]` for parameterized pages

**Server Components (Default):**
- Components render on server by default
- Reduced JavaScript bundle size
- Improved SEO and initial load time

**Client Components:**
- Marked with `'use client'` directive
- Interactive components (Socket, forms, animations)
- Hydrated on client-side

**Layout System:**
- `layout.tsx` wraps pages with shared UI
- Nested layouts for route segments
- Persistent UI across navigation

**Data Fetching:**
- Server Components fetch data directly
- Client Components use `useEffect` and API calls
- Hybrid approach for optimal performance

---

## 4. Database Architecture (Kiến trúc Cơ sở dữ liệu)

### 4.1 MongoDB Schema Design

**Document-Based NoSQL:**
- Flexible schema allows evolution without migrations
- Embedded documents for related data (reactions, read_by)
- References (ObjectId) for relationships (user_id, conversation_id)

**Key Collections:**

**1. Users Collection:**
```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  username: String (unique, indexed),
  password_hash: String (bcrypt),
  avatar_url: String,
  bio: String,
  role: String (enum: admin, moderator, member),
  school_id: ObjectId (ref: School),
  is_online: Boolean,
  last_seen: Date,
  is_verified: Boolean,
  google_id: String,
  preferences: {
    theme: String,
    font_size: String
  },
  created_at: Date,
  updated_at: Date
}
```

**2. Messages Collection:**
```javascript
{
  _id: ObjectId,
  conversation_id: ObjectId (ref: Conversation, indexed),
  sender_id: ObjectId (ref: User, indexed),
  type: String (enum: text, file, image, video, system),
  content: String,
  file_info: {
    file_id: ObjectId (ref: File),
    filename: String,
    mime_type: String,
    size: Number,
    url: String
  },
  reply_to: ObjectId (ref: Message),
  thread_id: ObjectId (ref: Message),
  is_edited: Boolean,
  reactions: [{
    emoji: String,
    user_id: ObjectId
  }],
  read_by: [{
    user_id: ObjectId,
    read_at: Date
  }],
  ai_summary: String,
  created_at: Date (indexed with conversation_id),
  updated_at: Date
}
```

**3. Conversations Collection:**
```javascript
{
  _id: ObjectId,
  type: String (enum: direct, group),
  name: String,
  description: String,
  participants: [{
    user_id: ObjectId (ref: User),
    role: String (enum: owner, admin, member),
    joined_at: Date
  }],
  pinned_messages: [ObjectId],
  last_message: ObjectId (ref: Message),
  last_activity: Date,
  created_at: Date,
  updated_at: Date
}
```

### 4.2 Database Indexes

**Performance Optimizations:**
- `conversation_id + created_at` compound index on Messages (efficient message retrieval)
- `sender_id` index on Messages (user message queries)
- `email` unique index on Users (fast login lookup)
- `username` unique index on Users (search & validation)

**Query Patterns:**
- Messages: Filter by `conversation_id`, sort by `created_at` DESC
- Users: Lookup by `email` or `username`
- Conversations: Filter by `participants.user_id`

### 4.3 Data Relationships

**One-to-Many:**
- User → Messages (sender_id)
- Conversation → Messages (conversation_id)
- User → Conversations (participants array)

**Many-to-Many:**
- Users ↔ Conversations (through participants array)
- Users ↔ Users (through Friendships collection)

**Embedded vs Referenced:**
- **Embedded**: Reactions, read_by (small, frequently accessed)
- **Referenced**: User, Conversation, File (large, shared across documents)

---

## 5. Real-time Communication Architecture

### 5.1 Socket.io Implementation

**Connection Flow:**
```
Client → Socket.io Client connects with JWT token
         ↓
Backend → authenticateSocket middleware validates JWT
         ↓
         Extract userId from token
         ↓
         Join user-specific room: `user_${userId}`
         ↓
         Auto-join conversation rooms user is part of
         ↓
         Broadcast online status to all users
```

**Room Management:**
- **User Rooms**: `user_${userId}` - Direct user communication
- **Conversation Rooms**: `conversation_${conversationId}` - Group messaging
- **Automatic Joining**: Users auto-join all their conversation rooms on connect

**Event Architecture:**

**Client → Server Events:**
- `join_conversation` - Join conversation room
- `leave_conversation` - Leave conversation room
- `new_message` - Broadcast new message
- `typing` - User typing indicator
- `stop_typing` - User stopped typing
- `message_read` - Mark message as read
- `messages_read` - Bulk read receipt
- `message_edited` - Message edit notification
- `reaction_added` - Add emoji reaction
- `reaction_removed` - Remove reaction
- `message_pinned` - Pin message
- `vote_created` - Create poll
- `vote_cast` - Cast vote

**Server → Client Events:**
- `message_received` - New message broadcast
- `user_typing` - Typing indicator
- `user_stopped_typing` - Stop typing
- `read_receipt` - Read receipt confirmation
- `user_status_changed` - Online/offline status
- `initial_user_statuses` - Bulk status on connect
- `reaction_updated` - Reaction change
- `pin_updated` - Pin/unpin notification
- `thread_updated` - Thread reply count update
- `new_vote` - New poll created
- `vote_updated` - Vote result updated

**Scalability Considerations:**
- Room-based broadcasting (targeted delivery)
- User-to-socket mapping for direct messaging
- Efficient event filtering

### 5.2 Frontend Socket Integration

**SocketContext Provider:**
```typescript
// Manages socket connection lifecycle
- Connects with JWT token from localStorage
- Handles reconnection logic
- Provides socket instance via React Context
- Auto-disconnects on component unmount
```

**Event Subscription Pattern:**
```typescript
// Components subscribe to specific events
useEffect(() => {
  socket?.on('message_received', handleNewMessage);
  return () => socket?.off('message_received', handleNewMessage);
}, [socket]);
```

---

## 6. Authentication & Security Architecture

### 6.1 Authentication Mechanisms

**1. JWT-Based Authentication:**
- **Stateless**: No server-side session storage
- **Token Structure**: Header.Payload.Signature
- **Payload**: `{ userId, iat, exp }`
- **Expiration**: 7 days (configurable)
- **Storage**: Client-side localStorage

**2. Password Security:**
- **Hashing**: bcryptjs with salt rounds
- **Never Store Plaintext**: Only password_hash in database
- **Validation**: Express Validator enforces strength rules

**3. OAuth 2.0 Integration:**
- **Google OAuth**: Alternative authentication method
- **Flow**: Authorization Code Grant
- **State Management**: Prevents CSRF attacks

### 6.2 Security Middleware

**Authentication Middleware (`auth.js`):**
```javascript
// HTTP Request Authentication
1. Extract token from Authorization header
2. Verify JWT signature with secret
3. Validate expiration
4. Fetch user from database
5. Attach user to req.user
6. Next() to route handler
```

**Socket Authentication:**
```javascript
// WebSocket Authentication
1. Extract token from handshake.auth.token
2. Verify JWT (same as HTTP)
3. Attach userId to socket instance
4. Allow connection or reject
```

**CORS Configuration:**
- Whitelist allowed origins (frontend URLs)
- Credentials support for cookies/auth headers
- Production-ready security headers

### 6.3 Security Best Practices

✅ **Environment Variables**: Sensitive data in `.env` (not committed)  
✅ **HTTPS in Production**: Encrypted data transmission  
✅ **Input Validation**: Express Validator sanitizes user input  
✅ **SQL Injection Prevention**: Mongoose parameterized queries  
✅ **XSS Protection**: React auto-escaping, content sanitization  
✅ **Rate Limiting**: (Can be added for production)

---

## 7. File Storage Architecture

### 7.1 Cloudinary Integration

**Storage Strategy:**
- **Cloud Storage**: Cloudinary CDN for production
- **Local Fallback**: `backend/uploads/` for development
- **Automatic Detection**: Checks environment variables

**Upload Flow:**
```
Client → POST /api/files/upload (multipart/form-data)
         ↓
Backend → Multer middleware receives file
         ↓
         Check Cloudinary configuration
         ↓
         Upload to Cloudinary via SDK
         ↓
         Save metadata to MongoDB (File model)
         ↓
Client ← { file_id, url, size, mime_type }
```

**File Metadata Storage:**
```javascript
File Model {
  _id: ObjectId,
  original_name: String,
  cloudinary_public_id: String,
  url: String (Cloudinary CDN URL),
  mime_type: String,
  size: Number,
  uploaded_by: ObjectId (ref: User),
  conversation_id: ObjectId (ref: Conversation),
  created_at: Date
}
```

**Optimization Features:**
- **Automatic Format Conversion**: WebP for images
- **Responsive Images**: Dynamic sizing via URL parameters
- **CDN Delivery**: Global content delivery network
- **Transformation API**: Thumbnails, cropping, filters

---

## 8. AI Integration Architecture

### 8.1 Google Gemini AI

**Integration Purpose:**
- **Conversation Summarization**: Generate summaries of long conversations
- **Smart Features**: Future AI-powered enhancements

**Implementation:**
```javascript
// Gemini 2.5 Flash Model
- Fast inference for real-time features
- Cost-effective for production use
- Conversation context understanding
```

**API Flow:**
```
Client → POST /api/ai/summarize
         Body: { conversation_id }
         ↓
Backend → Fetch conversation messages
         ↓
         Format prompt for Gemini
         ↓
         Call Gemini API with messages
         ↓
         Parse response
         ↓
         Save summary to conversation
         ↓
Client ← { summary: String }
```

---

## 9. Deployment Architecture

### 9.1 Containerization (Docker)

**Docker Compose Setup:**
```
Services:
├── mongodb (MongoDB 7.0)
│   ├── Port: 27017
│   ├── Volumes: Data persistence
│   └── Health checks
│
├── backend (Node.js/Express)
│   ├── Port: 5001
│   ├── Depends on: mongodb
│   ├── Environment: .env variables
│   └── Health checks
│
└── frontend (Next.js)
    ├── Port: 3000
    ├── Depends on: backend
    └── Environment: API URLs
```

**Dockerfile Strategy:**
- **Multi-stage builds**: Optimize image size
- **Production optimizations**: Minimal dependencies
- **Security**: Non-root user execution

### 9.2 Cloud Deployment

**Backend Deployment (Render.com):**
- **Platform**: Render.com (Node.js hosting)
- **WebSocket Support**: Native Socket.io support
- **Environment Variables**: Secure configuration
- **Auto-deploy**: GitHub integration
- **Health Checks**: Automatic restart on failure

**Frontend Deployment (Vercel):**
- **Platform**: Vercel (Next.js optimized)
- **Edge Functions**: Global CDN distribution
- **Automatic SSL**: HTTPS by default
- **Preview Deployments**: Branch-based previews
- **Build Optimization**: Automatic code splitting

**Database (MongoDB Atlas):**
- **Cloud Database**: Managed MongoDB service
- **Global Clusters**: Multi-region support
- **Backup & Recovery**: Automated backups
- **Monitoring**: Performance insights

**File Storage (Cloudinary):**
- **CDN**: Global content delivery
- **Automatic Optimization**: Image/video processing
- **Scalability**: Unlimited storage

### 9.3 Deployment Flow

```
Developer → Push to GitHub
           ↓
           GitHub Webhook triggers
           ↓
┌─────────────────┬──────────────────┐
│   Render.com    │     Vercel       │
│   (Backend)     │    (Frontend)    │
│                 │                  │
│ 1. Pull code    │  1. Pull code    │
│ 2. Install deps │  2. Install deps │
│ 3. Build        │  3. Build        │
│ 4. Deploy       │  4. Deploy       │
│ 5. Health check │  5. Live         │
└─────────────────┴──────────────────┘
           ↓
    Production URLs:
    - Backend: https://xxx.onrender.com
    - Frontend: https://xxx.vercel.app
```

---

## 10. Performance & Scalability Considerations

### 10.1 Frontend Optimizations

**Next.js Optimizations:**
- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js Image component
- **Server Components**: Reduced JavaScript bundle
- **Static Generation**: Pre-rendered pages where possible

**React Optimizations:**
- **Memoization**: React.memo for expensive components
- **Lazy Loading**: Dynamic imports for heavy components
- **Virtualization**: Efficient list rendering (can be added)

### 10.2 Backend Optimizations

**Database:**
- **Indexes**: Strategic indexing on query fields
- **Pagination**: Limit query results
- **Projection**: Select only required fields
- **Connection Pooling**: Mongoose connection management

**API:**
- **Response Caching**: (Can be added with Redis)
- **Rate Limiting**: (Can be added for production)
- **Compression**: gzip compression middleware

**Real-time:**
- **Room-based Broadcasting**: Targeted event delivery
- **Event Debouncing**: Reduce redundant events

### 10.3 Scalability Strategies

**Horizontal Scaling:**
- Stateless backend (JWT-based auth enables this)
- Multiple backend instances behind load balancer
- Socket.io with Redis adapter for multi-server support

**Database Scaling:**
- MongoDB Atlas auto-scaling
- Read replicas for read-heavy operations
- Sharding for very large datasets (future)

**CDN & Caching:**
- Cloudinary CDN for media files
- Vercel Edge Network for static assets
- Browser caching for static resources

---

## 11. Technology Stack Summary

### Backend Stack
| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Runtime | Node.js | Latest LTS | JavaScript runtime |
| Framework | Express.js | 4.18 | Web application framework |
| Database | MongoDB | Atlas | Document database |
| ODM | Mongoose | 8.19 | Database object modeling |
| Real-time | Socket.io | 4.6 | WebSocket communication |
| Auth | JWT | 9.0 | Token-based authentication |
| Validation | Express Validator | 7.0 | Input validation |
| File Upload | Multer | 1.4 | File handling |
| Cloud Storage | Cloudinary | 2.8 | Media storage & CDN |
| AI | Google Gemini | 2.5 Flash | AI features |
| Email | Nodemailer/SendGrid | Latest | Email service |

### Frontend Stack
| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Framework | Next.js | 16 | React framework |
| Library | React | 19.2 | UI library |
| Language | TypeScript | 5.3 | Type-safe JavaScript |
| Styling | Tailwind CSS | 3.3 | Utility-first CSS |
| UI Components | Shadcn UI | Latest | Component library |
| Base Components | Radix UI | Latest | Accessible primitives |
| Icons | Lucide React | 0.552 | Icon library |
| HTTP Client | Axios | 1.6 | API communication |
| Real-time | Socket.io Client | 4.8 | WebSocket client |
| Animations | Framer Motion | 12.23 | Animation library |
| File Upload | React Dropzone | 14.3 | Drag-and-drop upload |
| Date Utils | date-fns | 2.30 | Date formatting |

### DevOps & Deployment
| Category | Technology | Purpose |
|----------|-----------|---------|
| Containerization | Docker | Application containerization |
| Orchestration | Docker Compose | Multi-container management |
| Backend Hosting | Render.com | Node.js hosting |
| Frontend Hosting | Vercel | Next.js optimized hosting |
| Database Hosting | MongoDB Atlas | Managed database |
| File Storage | Cloudinary | Cloud storage & CDN |
| Version Control | Git/GitHub | Source code management |

---

## 12. Key Architectural Decisions

### 12.1 3-Tier Architecture vs Other Patterns

**Decision: 3-Tier Architecture**

**Lý do lựa chọn:**
- ✅ **Clear Separation**: Tách biệt rõ ràng giữa Presentation, Business Logic, và Data
- ✅ **Standard Pattern**: Mô hình phổ biến, dễ hiểu cho team
- ✅ **Scalability**: Scale từng tier độc lập theo nhu cầu
- ✅ **Technology Flexibility**: Mỗi tier có thể dùng công nghệ tốt nhất
- ✅ **Deployment Independence**: Deploy frontend/backend/database riêng biệt
- ✅ **Team Organization**: Team có thể làm việc song song trên các tier

**So sánh với các pattern khác:**
- **vs Monolith**: 3-tier cho phép scale và deploy độc lập tốt hơn
- **vs Microservices**: Đơn giản hơn, phù hợp với quy mô hiện tại
- **vs 2-Tier (Client-Server)**: Tách biệt logic tốt hơn, dễ maintain

### 12.2 Monorepo vs Separate Repositories

**Decision: Monorepo**
- ✅ Shared types and utilities
- ✅ Single source of truth
- ✅ Easier cross-project refactoring
- ✅ Simplified dependency management

### 12.2 RESTful API vs GraphQL

**Decision: RESTful API**
- ✅ Simpler implementation
- ✅ Better caching support
- ✅ Easier debugging
- ✅ Sufficient for current use cases

### 12.3 MongoDB vs PostgreSQL

**Decision: MongoDB**
- ✅ Flexible schema for evolving features
- ✅ Easy to scale horizontally
- ✅ Document structure matches domain model
- ✅ Native JSON support

### 12.4 Socket.io vs WebSocket Native

**Decision: Socket.io**
- ✅ Automatic fallback to polling
- ✅ Room management built-in
- ✅ Reconnection handling
- ✅ Event-based API (easier than raw WebSocket)

### 12.5 Next.js App Router vs Pages Router

**Decision: App Router (Next.js 15)**
- ✅ Latest Next.js features
- ✅ Server Components by default
- ✅ Better performance
- ✅ Improved developer experience

### 12.6 Context API vs Redux

**Decision: Context API**
- ✅ Built into React (no dependencies)
- ✅ Sufficient for current state needs
- ✅ Simpler mental model
- ✅ Less boilerplate code

---

## 13. Conclusion

QuickPing được xây dựng theo **mô hình 3-Tier Architecture** - một kiến trúc chuẩn và hiệu quả cho các ứng dụng web hiện đại. Hệ thống được tổ chức code theo **Distributed Monorepo** pattern, cho phép:

✅ **Clear Architecture**: 3-tier architecture tách biệt rõ ràng Presentation, Business Logic, và Data layers  
✅ **Performance**: Server-side rendering, code splitting, CDN delivery  
✅ **Scalability**: Stateless backend, independent tier scaling, horizontal scaling support  
✅ **Developer Experience**: TypeScript, modern tooling, clear structure, shared codebase  
✅ **User Experience**: Real-time updates, responsive design, fast load times  
✅ **Security**: JWT authentication, input validation, secure deployment, tier-based security  
✅ **Maintainability**: Clear separation of concerns, modular architecture, independent deployment  
✅ **Deployment Flexibility**: Distributed deployment cho phép scale và update từng tier độc lập

Kiến trúc 3-tier này, kết hợp với các công nghệ hiện đại (Next.js, Express.js, MongoDB, Socket.io), cho phép hệ thống phát triển bền vững, dễ bảo trì và mở rộng trong tương lai. Mỗi tier có thể được tối ưu và scale độc lập, tạo nền tảng vững chắc cho sự phát triển lâu dài của ứng dụng.

---

*Document Version: 1.0*  
*Last Updated: December 2025*  
*Prepared for: QuickPing Project Presentation*
