# How to Run the Multi-School Management System

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Railway, Neon, Supabase, or local)
- Firebase account (for file storage)
- Git

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd academy

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

#### Option A: Railway (Recommended for Development)

1. Go to [Railway.app](https://railway.app)
2. Create a new project
3. Add PostgreSQL database
4. Copy the connection string

#### Option B: Neon (Free PostgreSQL)

1. Go to [Neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string

#### Option C: Local PostgreSQL

```bash
# Install PostgreSQL locally
# Then create database:
createdb academy_db
```

### 3. Environment Configuration

#### Backend (.env)

Create `backend/.env`:

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=3000
FRONTEND_URL="http://localhost:5173"

# Firebase (for file storage)
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_STORAGE_BUCKET="your-firebase-storage-bucket"
```

#### Frontend (.env)

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

### 4. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or use existing
3. Enable Storage
4. Go to Project Settings > Service Accounts
5. Generate new private key
6. Save as `backend/firebase-service-account.json`

### 5. Database Migration

```bash
cd backend

# Generate Prisma Client
npm run prisma:generate

# Push schema to database (development)
npx prisma db push

# Or create migration (production)
npm run prisma:migrate

# Seed database with initial data
npm run prisma:seed
```

### 6. Start Development Servers

#### Terminal 1: Backend

```bash
cd backend
npm run start:dev
```

Backend will run on: `http://localhost:3000`
API Docs: `http://localhost:3000/api/docs`

#### Terminal 2: Frontend

```bash
cd frontend
npm run dev
```

Frontend will run on: `http://localhost:5173`

## Default Login Credentials

After seeding:

- **Super Admin**: `superadmin@school.com` / `superadmin123`
- **Admin**: `admin@school.com` / `admin123`
- **Management**: `principal@school.com` / `principal123`

## Production Build

### Backend

```bash
cd backend
npm run build
npm run start:prod
```

### Frontend

```bash
cd frontend
npm run build
# Serve dist/ folder with nginx, apache, or any static server
```

## Troubleshooting

### Database Connection Error

- Check `DATABASE_URL` in `backend/.env`
- Ensure database is running and accessible
- Check firewall/network settings

### Port Already in Use

- Change `PORT` in `backend/.env`
- Or kill process using port 3000: `npx kill-port 3000`

### Firebase Upload Fails

- Verify `firebase-service-account.json` exists
- Check Firebase Storage rules allow uploads
- Verify project ID and bucket name

### CORS Errors

- Ensure `FRONTEND_URL` in backend `.env` matches frontend URL
- Check CORS settings in `backend/src/main.ts`

## Next Steps

1. Login as Super Admin
2. Create a school
3. Login as Admin/Management
4. Start managing students, teachers, and fees

For detailed API documentation, visit: `http://localhost:3000/api/docs`


