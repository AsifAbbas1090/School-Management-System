# Multi-School Management System

A comprehensive, production-grade school management system built with React, NestJS, PostgreSQL, and Firebase. Designed for managing multiple schools with role-based access control, fee management, student tracking, and more.

## 🚀 Features

### Core Features

- **Multi-School Management**: Manage multiple schools from a single platform
- **Role-Based Access Control**: Super Admin, Admin, Management, Teacher, Parent, Support Staff
- **Student Management**: Complete student lifecycle management with admission tracking
- **Fee Management**: Fee structures, invoices, payments, receipts, and handovers
- **Academic Structure**: Classes, sections, subjects management
- **User Management**: Teachers, parents, and management user accounts
- **Leave Management**: Request and approve leave for teachers and students
- **Announcements**: School-wide and targeted announcements
- **Messaging**: Internal messaging system
- **Exams & Results**: Exam creation and result management
- **Expenses**: Track school expenses with receipt uploads
- **Analytics Dashboard**: Comprehensive analytics for all roles
- **File Storage**: Firebase Storage integration for receipts and logos

### Technical Features

- **JWT Authentication**: Secure token-based authentication
- **Soft Delete**: Logical deletion for data recovery
- **Data Validation**: Input validation on both frontend and backend
- **API Documentation**: Swagger/OpenAPI documentation
- **Error Handling**: Comprehensive error handling
- **Type Safety**: TypeScript throughout
- **Responsive Design**: Mobile-friendly UI

## 🛠️ Tech Stack

### Frontend
- **React 19** with Vite
- **React Router DOM** for routing
- **Zustand** for state management
- **Lucide React** for icons
- **Recharts** for charts
- **React Hot Toast** for notifications
- **jsPDF** for PDF generation
- **date-fns** for date handling

### Backend
- **NestJS** (Node.js framework)
- **TypeScript**
- **Prisma** (ORM)
- **PostgreSQL** (Database)
- **JWT** (Authentication)
- **bcrypt** (Password hashing)
- **class-validator** (Validation)
- **Swagger/OpenAPI** (API Documentation)
- **Firebase Admin SDK** (File Storage)

## 📁 Project Structure

```
academy/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── store/         # Zustand stores
│   │   └── utils/         # Utility functions
│   └── package.json
│
├── backend/           # NestJS backend application
│   ├── src/
│   │   ├── academic/      # Academic module (classes, students, etc.)
│   │   ├── auth/         # Authentication module
│   │   ├── fees/         # Fees module
│   │   ├── schools/      # Schools module
│   │   ├── users/        # Users module
│   │   └── ...           # Other modules
│   ├── prisma/
│   │   ├── schema.prisma # Database schema
│   │   └── seed.ts       # Database seed script
│   └── package.json
│
└── README.md
```

## 🚦 Getting Started

See [HOW_TO_RUN.md](./HOW_TO_RUN.md) for detailed setup instructions.

**Note**: The frontend is partially integrated with the backend API. See [FRONTEND_BACKEND_INTEGRATION.md](./FRONTEND_BACKEND_INTEGRATION.md) for integration status and how to complete the integration.

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

Once the backend is running, visit:
- **Swagger UI**: `http://localhost:3000/api/docs`
- **API Base**: `http://localhost:3000/api`

## 🔐 User Roles & Permissions

### Super Admin
- Manage all schools
- View system-wide analytics
- Full access to all features

### Admin
- Manage school settings
- Manage users (teachers, parents, management)
- Manage students, classes, fees
- View school analytics

### Management
- Manage students and parents
- Manage teachers
- View fees and payments
- Approve leave requests
- View school analytics

### Teacher
- View assigned classes and students
- Create exams and enter results
- Request leave
- Send messages

### Parent
- View child's information
- View fees and make payments
- Request leave for child
- Send messages

### Support Staff
- Limited access based on assignment

## 📊 Database Schema

The system uses PostgreSQL with Prisma ORM. Key models:

- **User**: All user accounts (admin, teachers, parents, etc.)
- **School**: School information and subscription
- **Student**: Student records with admission tracking
- **Class, Section, Subject**: Academic structure
- **FeeStructure, FeeInvoice, FeePayment**: Fee management
- **LeaveRequest**: Leave management
- **Announcement, Message**: Communication
- **Exam, ExamResult**: Exam management
- **Expense**: Expense tracking

See `backend/prisma/schema.prisma` for complete schema.

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

Use the provided curl commands or Swagger UI:

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.com","password":"admin123"}'

# Get current user
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

### Frontend Testing

1. Login with default credentials
2. Create a school (Super Admin)
3. Login as Admin/Management
4. Add students, teachers, parents
5. Test fee management
6. Test other features

## 📝 Development Notes

### Adding New Features

1. **Backend**:
   - Create module in `backend/src/`
   - Add routes in controller
   - Update Prisma schema if needed
   - Run migrations

2. **Frontend**:
   - Add API service in `frontend/src/services/api.js`
   - Create page component
   - Add route in `App.jsx`
   - Update navigation if needed

### Database Migrations

```bash
# Development (push schema)
npx prisma db push

# Production (create migration)
npm run prisma:migrate
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection**: Check `DATABASE_URL` and database status
2. **CORS Errors**: Verify `FRONTEND_URL` in backend `.env`
3. **Firebase Upload**: Check service account file and permissions
4. **Port Conflicts**: Change port in `.env` or kill existing process

See [HOW_TO_RUN.md](./HOW_TO_RUN.md) for detailed troubleshooting.

## 📄 License

This project is proprietary software.

## 👥 Support

For issues and questions:
1. Check [HOW_TO_RUN.md](./HOW_TO_RUN.md)
2. Review API documentation at `/api/docs`
3. Check console logs for errors

## 🎯 Roadmap

- [ ] Email notifications
- [ ] SMS integration
- [ ] Advanced reporting
- [ ] Mobile app
- [ ] Multi-language support
- [ ] Attendance tracking automation
- [ ] Timetable management

## 🙏 Acknowledgments

Built with modern web technologies and best practices for scalability and maintainability.
