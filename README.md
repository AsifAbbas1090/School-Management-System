# 📘 School Management System

A complete, production-ready School Management System built with React, featuring role-based access control, comprehensive CRUD operations, and modern UI/UX design.

## 🌟 Features

### **Complete Module Coverage**
- ✅ **User Management** - Super Admin, Admin, Management, Teachers, Parents, Students, Support Staff
- ✅ **Multi-School Architecture** - Manage multiple schools and campuses
- ✅ **Staff Performance** - Track efficiency of management and feedback
- ✅ **Student Management** - Full CRUD with CSV import and advanced filtering
- ✅ **Teacher Management** - Employee records and workload assignment
- ✅ **Parent Management** - Link parents to students
- ✅ **Attendance System** - Checkbox-based, mark-all, and CSV import
- ✅ **Fee Management** - Dynamic fees, collection, handover tracking, and CSV import
- ✅ **Exams & Results** - Create exams, enter marks (Web/CSV), generate report cards
- ✅ **Timetable** - Class schedules with conflict prevention
- ✅ **Announcements** - Role-based broadcasting
- ✅ **Messaging** - Internal communication system
- ✅ **Leave Management** - Apply and approve leaves
- ✅ **Settings** - System configuration and academic year setup

### **Role-Based Dashboards**
- **Super Admin Dashboard** - Multi-school overview and global settings
- **Admin Dashboard** - Complete system overview with KPIs and charts
- **Management Dashboard** - Academic performance, approvals, and fee handover
- **Teacher Dashboard** - Classes, attendance, and marks entry
- **Parent Dashboard** - Child's academic progress and fees
- **Student Dashboard** - Personal academic information

### **Modern UI/UX**
- 🎨 Beautiful gradient designs and glassmorphism effects
- 🌓 Light/Dark theme support
- 📱 Fully responsive (desktop, tablet, mobile)
- ⚡ Smooth animations and micro-interactions
- 🎯 Intuitive navigation with breadcrumbs
- 🔔 Toast notifications for user feedback
- 📊 Interactive charts (Bar, Line, Pie)
- 🎭 Loading skeletons and empty states

## 🏗️ Architecture & Folder Structure

```
src/
├── components/
│   ├── common/           # Reusable UI components
│   │   ├── Avatar.jsx
│   │   ├── Breadcrumb.jsx
│   │   ├── Loading.jsx
│   │   ├── Modal.jsx
│   │   └── CSVImport.jsx # CSV Import utility
│   ├── layout/           # Layout components
│   │   ├── DashboardLayout.jsx
│   │   ├── Header.jsx
│   │   └── Sidebar.jsx
│   ├── dashboard/        # Dashboard-specific components
│   ├── students/         # Student module components
│   ├── teachers/         # Teacher module components
│   ├── attendance/       # Attendance module components
│   ├── fees/            # Fee management components
│   ├── exams/           # Exam module components
│   └── ...              # Other module components
├── pages/
│   ├── auth/            # Authentication pages
│   │   └── LoginPage.jsx
│   ├── dashboard/       # Dashboard pages
│   │   └── AdminDashboard.jsx
│   ├── admin/           # Admin specialized pages
│   │   └── StaffPerformancePage.jsx
│   ├── students/        # Student pages
│   │   └── StudentsPage.jsx
│   └── ...             # Other module pages
├── store/              # Zustand state management
│   └── index.js        # All stores (auth, students, teachers, schools, etc.)
├── services/           # API services
│   └── mockData.js     # Mock data and API simulation
├── utils/              # Utility functions
│   └── index.js        # Helper functions
├── constants/          # Application constants
│   └── index.js        # Roles, statuses, navigation items
├── types/              # Type definitions (JSDoc)
│   └── index.js
├── App.jsx             # Main app component with routing
├── main.jsx            # Entry point
└── index.css           # Global styles and design system
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd academy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:5173
   ```

## 🔐 Demo Credentials

### Super Admin
- **Email:** superadmin@school.com
- **Password:** superadmin123

### Admin
- **Email:** admin@school.com
- **Password:** admin123

### Management (Principal)
- **Email:** principal@school.com
- **Password:** principal123

### Teacher
- **Email:** teacher@school.com
- **Password:** teacher123

### Parent
- **Email:** parent@school.com
- **Password:** parent123

## 🛠️ Tech Stack

### Core
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router DOM** - Client-side routing

### State Management
- **Zustand** - Lightweight state management with persistence

### UI & Styling
- **Vanilla CSS** - Custom design system with CSS variables
- **Lucide React** - Modern icon library
- **Recharts** - Interactive charts and graphs
- **React Hot Toast** - Toast notifications

### Utilities
- **date-fns** - Date manipulation and formatting

## 📋 Key Features Implementation

### 1. Authentication System
- Multi-role login (Admin, Management, Teacher, Parent, Student)
- Protected routes with role-based access
- Persistent authentication state
- Password visibility toggle
- Forgot password functionality

### 2. Student Management
- Complete CRUD operations
- Advanced filtering (class, section, status)
- Real-time search
- Export to CSV
- Form validation
- Confirmation modals for delete operations

### 3. Dashboard Analytics
- KPI cards with trend indicators
- Monthly fee collection chart (Bar chart)
- Weekly attendance overview (Line chart)
- Class distribution (Pie chart)
- Recent activities feed
- Real-time statistics

### 4. Design System
- CSS custom properties for theming
- Reusable utility classes
- Consistent spacing and typography
- Color palette with semantic naming
- Responsive breakpoints
- Animation keyframes

## 🎨 Design Principles

### Visual Excellence
- Modern gradient backgrounds
- Glassmorphism effects
- Smooth transitions and animations
- Consistent color scheme
- Professional typography (Inter font)

### User Experience
- Intuitive navigation
- Clear visual hierarchy
- Helpful empty states
- Loading indicators
- Error handling with user-friendly messages
- Keyboard accessibility

### Responsiveness
- Desktop-first approach
- Tablet optimization
- Mobile-friendly layouts
- Flexible grid system

## 📦 Production Build

```bash
npm run build
```

The optimized production build will be in the `dist` folder.

## 🔄 State Management

The application uses **Zustand** for state management with the following stores:

- `useAuthStore` - Authentication and user session
- `useThemeStore` - Theme preferences
- `useStudentsStore` - Student data and operations
- `useTeachersStore` - Teacher data and operations
- `useParentsStore` - Parent data and operations
- `useAttendanceStore` - Attendance records
- `useFeesStore` - Fee structures and payments
- `useExamsStore` - Exams and results
- `useAnnouncementsStore` - Announcements
- `useMessagesStore` - Internal messaging
- `useLeaveStore` - Leave applications
- `useClassesStore` - Classes, sections, and subjects
- `useTimetableStore` - Timetable entries

## 🧪 Mock Data

The application includes comprehensive mock data for development:
- Sample users for all roles
- Student records with realistic data
- Teacher profiles with subject assignments
- Fee structures and payment records
- Announcements and activities

## 🔮 Future Enhancements

- [ ] Real backend API integration
- [ ] Advanced reporting and analytics
- [ ] Email notifications
- [ ] SMS integration
- [ ] Online payment gateway
- [ ] Mobile app (React Native)
- [ ] Real-time chat
- [ ] Video conferencing integration
- [ ] Document management
- [ ] Automated report card generation

## 📝 Code Quality

### Best Practices
- ✅ Component-based architecture
- ✅ Reusable utility functions
- ✅ Consistent naming conventions
- ✅ Proper error handling
- ✅ Form validation
- ✅ Responsive design
- ✅ Accessibility considerations
- ✅ Performance optimization
- ✅ Clean code principles
- ✅ No junk code

### Scalability
- Modular folder structure
- Separation of concerns
- Centralized state management
- Reusable components
- Easy to extend and maintain

## 🤝 Contributing

This is a production-ready template. Feel free to:
- Add new features
- Improve existing functionality
- Report bugs
- Suggest enhancements

## 📄 License

MIT License - feel free to use this project for your school or educational institution.

## 👨‍💻 Developer Notes

### Adding New Modules
1. Create page component in `src/pages/<module>/`
2. Create related components in `src/components/<module>/`
3. Add store in `src/store/index.js`
4. Add route in `src/App.jsx`
5. Update navigation in `src/constants/index.js`

### Customization
- Update school info in `src/constants/index.js`
- Modify color scheme in `src/index.css` (CSS variables)
- Add/remove roles in `src/constants/index.js`
- Customize navigation per role

---

**Built with ❤️ for educational institutions worldwide**
