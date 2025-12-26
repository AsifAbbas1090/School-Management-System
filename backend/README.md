# Backend API

NestJS backend for the Multi-School Management System.

## Quick Start

See the main [README.md](../README.md) and [HOW_TO_RUN.md](../HOW_TO_RUN.md) for complete setup instructions.

## Development

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
npm run prisma:generate
npx prisma db push
npm run prisma:seed

# Start development server
npm run start:dev
```

## API Documentation

Once running, visit: `http://localhost:3000/api/docs`

## Project Structure

```
src/
├── academic/      # Classes, sections, subjects, students
├── auth/          # Authentication & authorization
├── fees/          # Fee management
├── schools/       # School management
├── users/         # User management
├── leave/         # Leave management
├── announcements/ # Announcements
├── messaging/     # Messaging
├── exams/         # Exams & results
├── expenses/      # Expenses
├── analytics/     # Analytics
└── files/         # File uploads
```

## Environment Variables

See [HOW_TO_RUN.md](../HOW_TO_RUN.md) for environment variable configuration.
