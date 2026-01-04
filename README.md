# Multi-School Management System

An enterprise-grade educational management system crafted with React, NestJS, PostgreSQL, and Firebase technologies. Designed for managing multiple educational institutions with extensive role-based permissions, financial management, student tracking capabilities, and more.

## 🚀 Features

### Core Features

- **Multi-School Management**: Handle multiple schools from one centralized platform
- **Role-Based Access Control**: Supports Super Admin, Admin, Management, Teacher, Parent, and Support Staff roles
- **Student Management**: Full student lifecycle management including admission tracking
- **Fee Management**: Complete fee system with structures, invoices, payments, receipts, and handovers
- **Academic Structure**: Manage classes, sections, and subjects
- **User Management**: Handle user accounts for teachers, parents, and management
- **Leave Management**: Leave request and approval system for teachers and students
- **Announcements**: School-wide announcements and targeted messaging
- **Messaging**: Built-in internal messaging system
- **Exams & Results**: Create exams and manage results
- **Expenses**: Expense tracking with receipt upload functionality
- **Analytics Dashboard**: Detailed analytics available for all user roles
- **File Storage**: Integrated Firebase Storage for receipts and logos

### Technical Features

- **JWT Authentication**: Secure authentication using token-based system
- **Soft Delete**: Implemented logical deletion for data recovery capabilities
- **Data Validation**: Comprehensive input validation on frontend and backend
- **API Documentation**: Complete Swagger/OpenAPI documentation
- **Error Handling**: Robust error handling throughout the application
- **Type Safety**: Full TypeScript implementation
- **Responsive Design**: Mobile-responsive user interface

## 🛠️ Tech Stack

### Frontend
- **React 19** powered by Vite build tool
- **React Router DOM** handles application routing
- **Zustand** manages application state
- **Lucide React** provides icon components
- **Recharts** renders data visualizations
- **React Hot Toast** displays user notifications
- **jsPDF** enables PDF document generation
- **date-fns** manages date formatting and operations

### Backend
- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type-safe JavaScript
- **Prisma** - Modern database ORM
- **PostgreSQL** - Relational database system
- **JWT** - JSON Web Token authentication
- **bcrypt** - Secure password hashing library
- **class-validator** - Decorator-based validation
- **Swagger/OpenAPI** - Interactive API documentation
- **Firebase Admin SDK** - Cloud file storage integration

## 📁 Project Structure

```
academy/
├── frontend/          # React-based client application
│   ├── src/
│   │   ├── components/    # Shared UI components
│   │   ├── pages/         # Route-based page views
│   │   ├── services/      # External API integrations
│   │   ├── store/         # Global state management
│   │   └── utils/         # Helper functions and utilities
│   └── package.json
│
├── backend/           # NestJS server-side application
│   ├── src/
│   │   ├── academic/      # Academic operations (classes, students, etc.)
│   │   ├── auth/         # User authentication logic
│   │   ├── fees/         # Financial fee operations
│   │   ├── schools/      # School administration
│   │   ├── users/        # User account management
│   │   └── ...           # Additional feature modules
│   ├── prisma/
│   │   ├── schema.prisma # Database structure definition
│   │   └── seed.ts       # Initial data seeding script
│   └── package.json
│
└── README.md
```

## 🚦 Getting Started

Refer to [HOW_TO_RUN.md](./HOW_TO_RUN.md) for comprehensive setup instructions.

**Note**: The frontend has partial integration with the backend API. Check [FRONTEND_BACKEND_INTEGRATION.md](./FRONTEND_BACKEND_INTEGRATION.md) for current integration status and completion guidelines.

### Quick Start

```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Setup environment variables
# Copy .env.example to .env and configure

# 3. Setup database
cd backend
npm run prisma:generate
npx prisma db push
npm run prisma:seed

# 4. Start servers
# Terminal 1: Backend
cd backend && npm run start:dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

## 📚 API Documentation

When the backend server is active, access the following:
- **Swagger UI**: Available at `http://localhost:3000/api/docs`
- **API Base URL**: `http://localhost:3000/api`

## 🔐 User Roles & Permissions

### Super Admin
- Complete control over all schools in the system
- Access to system-wide analytics and reporting
- Unlimited access to every feature and module

### Admin
- Configure school-specific settings
- Manage all user accounts (teachers, parents, management staff)
- Oversee students, classes, and fee operations
- Access comprehensive school analytics

### Management
- Administer student and parent records
- Handle teacher account management
- Monitor fee transactions and payments
- Process leave request approvals
- Review school performance analytics

### Teacher
- Access assigned classes and student lists
- Create exam schedules and record results
- Submit leave requests
- Communicate via messaging system

### Parent
- Access child's academic and personal information
- View fee statements and process payments
- Submit leave requests for children
- Send and receive messages

### Support Staff
- Restricted access permissions based on role assignments

## 📊 Database Schema

PostgreSQL database managed through Prisma ORM. Primary data models include:

- **User**: Complete user account system (admins, teachers, parents, etc.)
- **School**: Institutional data and subscription details
- **Student**: Comprehensive student records including admission history
- **Class, Section, Subject**: Organizational academic structure
- **FeeStructure, FeeInvoice, FeePayment**: Complete fee management system
- **LeaveRequest**: Staff and student leave tracking
- **Announcement, Message**: Internal communication system
- **Exam, ExamResult**: Examination and grading management
- **Expense**: Financial expense record keeping

Complete database schema details can be found in `backend/prisma/schema.prisma`.

## 🔧 Configuration

### Environment Variables

**Backend** (`backend/.env`):
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `PORT`: Server port (default: 3000)
- `FRONTEND_URL`: Frontend URL for CORS
- Firebase configuration

**Frontend** (`frontend/.env`):
- `VITE_API_URL`: Backend API URL

## 🧪 Testing

### Backend API Testing

You can test the API using curl commands or the interactive Swagger UI:

```bash
# User authentication
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.com","password":"admin123"}'

# Retrieve current user profile
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

### Frontend Testing

1. Authenticate using default login credentials
2. Create a new school instance (requires Super Admin role)
3. Sign in as Admin or Management user
4. Add test data for students, teachers, and parents
5. Verify fee management workflows
6. Validate additional system features

## 📝 Development Notes

### Adding New Features

1. **Backend Development**:
   - Develop new module within `backend/src/` directory
   - Implement route handlers in the controller
   - Modify Prisma schema when database changes are required
   - Execute database migrations

2. **Frontend Development**:
   - Extend API service layer in `frontend/src/services/api.js`
   - Build new page component
   - Register route in `App.jsx` routing configuration
   - Update navigation menus as necessary

### Database Migrations

```bash
# Development environment (sync schema directly)
npx prisma db push

# Production environment (generate migration files)
npm run prisma:migrate
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Problems**: Verify `DATABASE_URL` configuration and ensure database is running
2. **CORS Errors**: Confirm `FRONTEND_URL` is correctly set in backend `.env` file
3. **Firebase Upload Failures**: Validate service account credentials and file permissions
4. **Port Conflicts**: Modify port settings in `.env` or terminate processes using the port

See [HOW_TO_RUN.md](./HOW_TO_RUN.md) for detailed troubleshooting.

## 📄 License

This is proprietary software.

## 👥 Support

For support and inquiries:
1. Refer to [HOW_TO_RUN.md](./HOW_TO_RUN.md)
2. Consult API documentation available at `/api/docs`
3. Review console logs for error messages

## 🎯 Roadmap

- [ ] Email notifications
- [ ] SMS integration
- [ ] Advanced reporting
- [ ] Mobile app
- [ ] Multi-language support
- [ ] Attendance tracking automation
- [ ] Timetable management

## 🙏 Acknowledgments

Developed using cutting-edge web technologies following industry best practices to ensure scalability, performance, and long-term maintainability.
