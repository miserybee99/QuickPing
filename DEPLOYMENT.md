# QuickPing Deployment Guide

## Backend Deployment (Render)

### 1. Deploy to Render
1. Kết nối GitHub repository với Render
2. Chọn branch `master`
3. Root directory: `backend`
4. Build command: `npm install`
5. Start command: `npm start`

### 2. Environment Variables trên Render
```env
PORT=5001
NODE_ENV=production

# MongoDB Atlas
MONGODB_URI=mongodb+srv://miserybee99_db_user:ctcfJaMNGdvjQRQX@cluster0.7jwa5am.mongodb.net/quickping?retryWrites=true&w=majority&appName=Cluster0

# JWT
JWT_SECRET=quickping-super-secret-jwt-key-change-in-production-2024
JWT_EXPIRES_IN=7d

# Frontend URL (thay bằng URL Vercel của bạn)
FRONTEND_URL=https://quick-ping-plum.vercel.app

# SMTP (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# OTP
OTP_EXPIRES_MINUTES=10
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_MAX_RESEND_PER_HOUR=5

# Google OAuth (thay bằng URL Render của bạn)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-backend.onrender.com/api/auth/google/callback

# OpenAI
OPENAI_API_KEY=your-openai-api-key
```

---

## Frontend Deployment (Vercel)

### 1. Deploy to Vercel
1. Import repository từ GitHub
2. Framework Preset: Next.js
3. Root Directory: `frontend`
4. Build Command: `npm run build` (hoặc để mặc định)
5. Output Directory: `.next` (hoặc để mặc định)

### 2. Environment Variables trên Vercel
```env
# Backend URL (thay bằng URL Render của bạn)
NEXT_PUBLIC_API_URL=https://quickping-axgd.onrender.com/api
NEXT_PUBLIC_SOCKET_URL=https://quickping-axgd.onrender.com
```

**Lưu ý**: Sau khi thêm environment variables, nhớ **Redeploy** project!

---

## Google OAuth Configuration

### Cập nhật Google Cloud Console
1. Truy cập: https://console.cloud.google.com/apis/credentials
2. Chọn OAuth 2.0 Client ID của bạn
3. **Authorized JavaScript origins**:
   ```
   https://quick-ping-plum.vercel.app
   https://quickping-axgd.onrender.com
   http://localhost:3000
   http://localhost:5001
   ```

4. **Authorized redirect URIs**:
   ```
   https://quickping-axgd.onrender.com/api/auth/google/callback
   http://localhost:5001/api/auth/google/callback
   ```

5. Nhấn **Save**

---

## Kiểm tra sau khi deploy

### 1. Kiểm tra Backend
```bash
# Health check
curl https://quickping-axgd.onrender.com/api/health

# Test auth endpoint
curl https://quickping-axgd.onrender.com/api/auth/google
```

### 2. Kiểm tra Frontend
- Mở browser: https://your-app.vercel.app
- Kiểm tra Console (F12) xem có lỗi CORS không
- Test đăng ký/đăng nhập thường
- Test đăng nhập Google

### 3. Kiểm tra WebSocket
- Đăng nhập thành công
- Mở Console (F12) và kiểm tra logs
- Gửi tin nhắn và xem realtime có hoạt động không

---

## Troubleshooting

### Lỗi CORS
- Kiểm tra `FRONTEND_URL` trên Render đã đúng chưa
- Kiểm tra file `backend/server.js` có cấu hình CORS đúng không

### Google OAuth không hoạt động
- Kiểm tra `GOOGLE_CALLBACK_URL` trên Render
- Kiểm tra Authorized redirect URIs trên Google Console
- Kiểm tra `NEXT_PUBLIC_API_URL` trên Vercel

### WebSocket không kết nối
- Kiểm tra `NEXT_PUBLIC_SOCKET_URL` trên Vercel
- Render free tier có thể sleep sau 15 phút không hoạt động
- Kiểm tra backend logs trên Render

### Build failed trên Vercel
- Kiểm tra logs để xem lỗi cụ thể
- Đảm bảo đã clear cache và rebuild
- Kiểm tra Node version compatibility

---

## Production URLs

Sau khi deploy xong, cập nhật các URL sau:

**Backend (Render)**: `https://your-backend.onrender.com`
**Frontend (Vercel)**: `https://your-app.vercel.app`

Ghi chú lại URLs để dễ reference sau này!
