# Backend API

NestJS-based backend server for the Multi-School Management System platform.

## Quick Start

Please review the main [README.md](../README.md) and [HOW_TO_RUN.md](../HOW_TO_RUN.md) files for detailed setup and installation instructions.

## Development

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Update .env with your settings

# Initialize database
npm run prisma:generate
npx prisma db push
npm run prisma:seed

# Run development server
npm run start:dev
```

## API Documentation

After starting the server, documentation is accessible at: `http://localhost:3000/api/docs`

## Project Structure

```
src/
├── academic/      # Classes, sections, subjects, and students
├── auth/          # Authentication and authorization
├── fees/          # Fee management system
├── schools/       # School management module
├── users/         # User management module
├── leave/         # Leave management system
├── announcements/ # Announcements module
├── messaging/     # Messaging system
├── exams/         # Exams and results
├── expenses/      # Expense tracking
├── analytics/     # Analytics module
└── files/         # File upload functionality
```

## Environment Variables

Please see [HOW_TO_RUN.md](../HOW_TO_RUN.md) for comprehensive environment variable configuration instructions.
