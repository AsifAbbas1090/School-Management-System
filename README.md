<div align="center">

# 🎓 Multi-School Management System

**An enterprise-grade educational management platform**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

*A comprehensive, production-ready school management system built with modern web technologies*

[Features](#-features) • [Tech Stack](#️-tech-stack) • [Getting Started](#-getting-started) • [Documentation](#-api-documentation) • [Support](#-support)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Documentation](#-api-documentation)
- [User Roles & Permissions](#-user-roles--permissions)
- [Database Schema](#-database-schema)
- [Configuration](#️-configuration)
- [Testing](#-testing)
- [Development](#-development-notes)
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#-roadmap)

---

## 🎯 Overview

<div align="center">

> **An enterprise-grade educational management system crafted with React, NestJS, PostgreSQL, and Firebase technologies.**
> 
> Designed for managing multiple educational institutions with extensive role-based permissions, financial management, student tracking capabilities, and more.

</div>

---

## 🚀 Features

### 💼 Core Features

<table>
<tr>
<td width="50%">

#### 🏫 Multi-School Management
Handle multiple schools from one centralized platform

#### 👥 Role-Based Access Control
Supports Super Admin, Admin, Management, Teacher, Parent, and Support Staff roles

#### 🎓 Student Management
Full student lifecycle management including admission tracking

#### 💰 Fee Management
Complete fee system with structures, invoices, payments, receipts, and handovers

#### 📚 Academic Structure
Manage classes, sections, and subjects

#### 🔐 User Management
Handle user accounts for teachers, parents, and management

</td>
<td width="50%">

#### 📅 Leave Management
Leave request and approval system for teachers and students

#### 📢 Announcements
School-wide announcements and targeted messaging

#### 💬 Messaging
Built-in internal messaging system

#### 📝 Exams & Results
Create exams and manage results

#### 💳 Expenses
Expense tracking with receipt upload functionality

#### 📊 Analytics Dashboard
Detailed analytics available for all user roles

#### 📁 File Storage
Integrated Firebase Storage for receipts and logos

</td>
</tr>
</table>

### ⚙️ Technical Features

<div align="center">

| Feature | Description |
|:-------:|:-----------|
| 🔒 **JWT Authentication** | Secure authentication using token-based system |
| 🗑️ **Soft Delete** | Logical deletion for data recovery capabilities |
| ✅ **Data Validation** | Comprehensive input validation on frontend and backend |
| 📖 **API Documentation** | Complete Swagger/OpenAPI documentation |
| 🛡️ **Error Handling** | Robust error handling throughout the application |
| 📘 **Type Safety** | Full TypeScript implementation |
| 📱 **Responsive Design** | Mobile-responsive user interface |

</div>

---

## 🛠️ Tech Stack

### 🎨 Frontend Technologies

<table>
<tr>
<th>Technology</th>
<th>Purpose</th>
<th>Version</th>
</tr>
<tr>
<td><strong>React</strong></td>
<td>UI Framework</td>
<td>19</td>
</tr>
<tr>
<td><strong>Vite</strong></td>
<td>Build Tool & Dev Server</td>
<td>Latest</td>
</tr>
<tr>
<td><strong>React Router DOM</strong></td>
<td>Client-side Routing</td>
<td>Latest</td>
</tr>
<tr>
<td><strong>Zustand</strong></td>
<td>State Management</td>
<td>Latest</td>
</tr>
<tr>
<td><strong>Lucide React</strong></td>
<td>Icon Library</td>
<td>Latest</td>
</tr>
<tr>
<td><strong>Recharts</strong></td>
<td>Data Visualization</td>
<td>Latest</td>
</tr>
<tr>
<td><strong>React Hot Toast</strong></td>
<td>Notification System</td>
<td>Latest</td>
</tr>
<tr>
<td><strong>jsPDF</strong></td>
<td>PDF Generation</td>
<td>Latest</td>
</tr>
<tr>
<td><strong>date-fns</strong></td>
<td>Date Utilities</td>
<td>Latest</td>
</tr>
</table>

### ⚡ Backend Technologies

<table>
<tr>
<th>Technology</th>
<th>Purpose</th>
</tr>
<tr>
<td><strong>NestJS</strong></td>
<td>Progressive Node.js framework</td>
</tr>
<tr>
<td><strong>TypeScript</strong></td>
<td>Type-safe JavaScript</td>
</tr>
<tr>
<td><strong>Prisma</strong></td>
<td>Modern database ORM</td>
</tr>
<tr>
<td><strong>PostgreSQL</strong></td>
<td>Relational database system</td>
</tr>
<tr>
<td><strong>JWT</strong></td>
<td>JSON Web Token authentication</td>
</tr>
<tr>
<td><strong>bcrypt</strong></td>
<td>Secure password hashing library</td>
</tr>
<tr>
<td><strong>class-validator</strong></td>
<td>Decorator-based validation</td>
</tr>
<tr>
<td><strong>Swagger/OpenAPI</strong></td>
<td>Interactive API documentation</td>
</tr>
<tr>
<td><strong>Firebase Admin SDK</strong></td>
<td>Cloud file storage integration</td>
</tr>
</table>

---

## 📁 Project Structure

```
academy/
├── 📂 frontend/          # React-based client application
│   ├── src/
│   │   ├── 📁 components/    # Shared UI components
│   │   ├── 📁 pages/         # Route-based page views
│   │   ├── 📁 services/      # External API integrations
│   │   ├── 📁 store/         # Global state management
│   │   └── 📁 utils/         # Helper functions and utilities
│   └── package.json
│
├── 📂 backend/           # NestJS server-side application
│   ├── src/
│   │   ├── 📁 academic/      # Academic operations (classes, students, etc.)
│   │   ├── 📁 auth/         # User authentication logic
│   │   ├── 📁 fees/         # Financial fee operations
│   │   ├── 📁 schools/      # School administration
│   │   ├── 📁 users/        # User account management
│   │   └── 📁 ...           # Additional feature modules
│   ├── prisma/
│   │   ├── schema.prisma # Database structure definition
│   │   └── seed.ts       # Initial data seeding script
│   └── package.json
│
└── README.md
```

---

## 🚦 Getting Started

> **📚 Detailed Instructions**: Refer to [HOW_TO_RUN.md](./HOW_TO_RUN.md) for comprehensive setup instructions.

> **⚠️ Important Note**: The frontend has partial integration with the backend API. Check [FRONTEND_BACKEND_INTEGRATION.md](./FRONTEND_BACKEND_INTEGRATION.md) for current integration status and completion guidelines.

### ⚡ Quick Start Guide

<div align="center">

```bash
# 1️⃣ Install Dependencies
cd backend && npm install
cd ../frontend && npm install

# 2️⃣ Setup Environment Variables
# Copy .env.example to .env and configure

# 3️⃣ Setup Database
cd backend
npm run prisma:generate
npx prisma db push
npm run prisma:seed

# 4️⃣ Start Servers
# Terminal 1: Backend Server
cd backend && npm run start:dev

# Terminal 2: Frontend Development Server
cd frontend && npm run dev
```

</div>

---

## 📚 API Documentation

<div align="center">

### 🔗 Access Points

| Service | URL | Description |
|:-------:|:---:|:-----------|
| **Swagger UI** | `http://localhost:3000/api/docs` | Interactive API documentation |
| **API Base** | `http://localhost:3000/api` | REST API endpoint |

</div>

> **💡 Tip**: Once the backend server is active, visit the Swagger UI for interactive API exploration and testing.

---

## 🔐 User Roles & Permissions

<div align="center">

### 👨‍💼 Role Access Matrix

<table>
<tr>
<th>Role</th>
<th>Permissions</th>
</tr>
<tr>
<td><strong>👑 Super Admin</strong></td>
<td>
• Complete control over all schools<br>
• System-wide analytics and reporting<br>
• Unlimited access to all features
</td>
</tr>
<tr>
<td><strong>👤 Admin</strong></td>
<td>
• Configure school-specific settings<br>
• Manage all user accounts<br>
• Oversee students, classes, and fees<br>
• Access comprehensive analytics
</td>
</tr>
<tr>
<td><strong>👔 Management</strong></td>
<td>
• Administer student and parent records<br>
• Handle teacher account management<br>
• Monitor fee transactions<br>
• Process leave approvals<br>
• Review performance analytics
</td>
</tr>
<tr>
<td><strong>👨‍🏫 Teacher</strong></td>
<td>
• Access assigned classes and students<br>
• Create exam schedules and record results<br>
• Submit leave requests<br>
• Use messaging system
</td>
</tr>
<tr>
<td><strong>👨‍👩‍👧 Parent</strong></td>
<td>
• Access child's information<br>
• View fees and make payments<br>
• Submit leave requests for children<br>
• Send and receive messages
</td>
</tr>
<tr>
<td><strong>🔧 Support Staff</strong></td>
<td>
• Restricted access based on assignments
</td>
</tr>
<tr>
<td><strong>🎓 Student</strong></td>
<td>
<strong>Login not yet active.</strong> A dedicated student portal is deferred (see <a href="./FUTURE_PLAN.md">FUTURE_PLAN.md</a> Phase 3-D). The STUDENT role exists for future use; do not rely on it for production access until that phase ships.
</td>
</tr>
</table>

</div>

---

## 📊 Database Schema

<div align="center">

> **PostgreSQL database managed through Prisma ORM**

</div>

### 🗄️ Key Data Models

<table>
<tr>
<td width="33%">

**👤 User**
Complete user account system

**🏫 School**
Institutional data and subscriptions

**🎓 Student**
Comprehensive student records

</td>
<td width="33%">

**📚 Class, Section, Subject**
Academic structure organization

**💰 FeeStructure, FeeInvoice, FeePayment**
Complete fee management system

**📅 LeaveRequest**
Leave tracking system

</td>
<td width="33%">

**📢 Announcement, Message**
Internal communication system

**📝 Exam, ExamResult**
Examination and grading management

**💳 Expense**
Financial expense tracking

</td>
</tr>
</table>

> **📖 Complete Schema**: See `backend/prisma/schema.prisma` for detailed database schema.

---

## 🔧 Configuration

### 🌐 Environment Variables

<div align="center">

#### 🔙 Backend Configuration (`backend/.env`)

| Variable | Description | Default |
|:--------:|:-----------|:-------:|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | Secret key for JWT tokens | - |
| `PORT` | Server port | `3000` |
| `FRONTEND_URL` | Frontend URL for CORS | - |
| Firebase Config | Firebase service account | - |

#### 🎨 Frontend Configuration (`frontend/.env`)

| Variable | Description |
|:--------:|:-----------|
| `VITE_API_URL` | Backend API URL |

</div>

---

## 🧪 Testing

Run tests with `npm run test` in `backend/`.

Integration tests cover: auth, leave, exams, parent scoping, fee scoping.

---

## 📝 Development Notes

### ➕ Adding New Features

<div align="center">

<table>
<tr>
<td width="50%">

#### 🔙 Backend Development

1. Develop new module in `backend/src/`
2. Implement route handlers in controller
3. Modify Prisma schema if needed
4. Execute database migrations

</td>
<td width="50%">

#### 🎨 Frontend Development

1. Extend API service in `frontend/src/services/api.js`
2. Build new page component
3. Register route in `App.jsx`
4. Update navigation menus

</td>
</tr>
</table>

</div>

### 🔄 Database Migrations

<div align="center">

```bash
# 🛠️ Development Environment (sync schema directly)
npx prisma db push

# 🚀 Production Environment (generate migration files)
npm run prisma:migrate
```

</div>

---

## 🐛 Troubleshooting

<div align="center">

### 🔧 Common Issues & Solutions

<table>
<tr>
<th>Issue</th>
<th>Solution</th>
</tr>
<tr>
<td><strong>🔌 Database Connection Problems</strong></td>
<td>Verify <code>DATABASE_URL</code> configuration and ensure database is running</td>
</tr>
<tr>
<td><strong>🌐 CORS Errors</strong></td>
<td>Confirm <code>FRONTEND_URL</code> is correctly set in backend <code>.env</code> file</td>
</tr>
<tr>
<td><strong>☁️ Firebase Upload Failures</strong></td>
<td>Validate service account credentials and file permissions</td>
</tr>
<tr>
<td><strong>🚪 Port Conflicts</strong></td>
<td>Modify port settings in <code>.env</code> or terminate processes using the port</td>
</tr>
</table>

</div>

> **📚 More Help**: See [HOW_TO_RUN.md](./HOW_TO_RUN.md) for detailed troubleshooting guide.

---

## 🎯 Roadmap

<div align="center">

### 🚧 Upcoming Features

| Status | Feature | Priority |
|:------:|:--------|:--------:|
| ⏳ | 📧 Email notifications | High |
| ⏳ | 📱 SMS integration | Medium |
| ⏳ | 📊 Advanced reporting | High |
| ⏳ | 📲 Mobile app | Low |
| ⏳ | 🌍 Multi-language support | Medium |
| ⏳ | ✅ Attendance tracking automation | High |
| ⏳ | 📅 Timetable management | Medium |

</div>

---

## 📄 License

<div align="center">

> **⚠️ Proprietary Software**

This project is proprietary and confidential.

</div>

---

## 👥 Support

<div align="center">

### 🆘 Need Help?

<table>
<tr>
<td align="center">

**📖 Documentation**
- [HOW_TO_RUN.md](./HOW_TO_RUN.md)

</td>
<td align="center">

**🔗 API Docs**
- `/api/docs` (Swagger UI)

</td>
<td align="center">

**🔍 Debugging**
- Check console logs
- Review error messages

</td>
</tr>
</table>

</div>

---

## 🙏 Acknowledgments

<div align="center">

**Built with modern web technologies following industry best practices**

*Ensuring scalability, performance, and long-term maintainability*

---

<div align="center">

### ⭐ If you find this project useful, consider giving it a star!

**Made with ❤️ using React, NestJS, and PostgreSQL**

</div>
