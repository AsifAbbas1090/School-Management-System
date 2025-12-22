# 🎓 Multi-School Management System

A production-ready, **multi-school, multi-campus SaaS platform** built with React for managing educational institutions. This is a complete **frontend-only** implementation designed to be scalable, reusable, and extensible.

> **Important**: This is a frontend-only system using mock data and hardcoded authentication. No backend server or real authentication system is implemented.

---

## 🌟 **Product Philosophy**

This is **NOT a single-school demo** — it's a complete **SaaS-style platform** where:
- **One Super Admin** manages multiple schools
- Each school operates **independently** with isolated data
- **Scalable architecture** ready for production
- **Clean, reusable components** with zero junk code
- Frontend-only with **localStorage persistence**
- **School-specific URLs** for branded login experiences

---

## 👥 **User Roles & Permissions**

### 1. **Super Admin** (Platform Owner)
- **Login URL**: `/superadmin/login`
- Manage multiple schools
- Add, view, edit, and delete schools
- Set admin credentials (email + password) for each school
- Track subscription & revenue across all schools
- View aggregated statistics per school
- Upload school logos (actual file upload - PNG/JPG, max 5MB)
- Set principal name for each school
- Set owner/admin name for signature on documents
- **Auto-generates** comprehensive school data when adding a school:
  - 10 Classes (Class 1-10)
  - 20 Sections (2 per class: A & B)
  - 14 Subjects (Math, English, Science, etc.)
  - 25 Teachers with subjects assigned
  - 200-300 Students with parent accounts
  - All data is school-specific and isolated

### 2. **School Admin**
- **Login URL**: `/{school-slug}/signin` (e.g., `/al-abbas-college/signin`)
- Complete school management dashboard
- Add and manage:
  - **Management** users (email + password set by admin)
  - **Students** (email optional, **no login** - records only)
  - **Teachers** (email + password set by admin/management)
  - **Parents** (email + password set by admin/management)
- View fee handovers from Management
- Approve/reject leave requests from Teachers and Parents
- **Cannot change** their own password (set by Super Admin)

### 3. **Management** (Principal/Director)
- **Login URL**: `/{school-slug}/signin`
- Academic performance tracking
- **Financial Handover System**: Hand over collected fees to Admin
- **Leave Approval System**: Approve or reject leave requests from:
  - Teachers
  - Parents
- View students, teachers, and support staff
- Access exam results and announcements
- Can add Teachers and Parents with passwords

### 4. **Teacher**
- **Login URL**: `/{school-slug}/signin`
- Dashboard with class overview
- Marks entry for exams
- **Leave Request** (for self only, cannot approve)
- Messages and internal communication
- ❌ **No Attendance** (removed)
- ❌ **No Timetable** (removed)
- **Cannot change** password (set by Admin/Management)

### 5. **Parent**
- **Login URL**: `/{school-slug}/signin`
- View child's academic progress
- View and pay fees
- View exam results
- **Leave Request** (for child only, cannot approve)
- Messages
- ❌ **No Attendance** (removed)
- ❌ **No Timetable** (removed)
- **Cannot change** password (set by Admin/Management)

### 6. **Student**
- Records only — **no login capability**
- Email is **optional**
- Data managed by Admin/Management

---

## 🚀 **Key Features**

### **Multi-School System**
- ✅ Add and manage **multiple schools**
- ✅ Each school has **completely isolated data**
- ✅ **School-specific URLs**: `/{school-slug}/signin`
- ✅ **Auto-generation**: When a school is added, the system automatically creates:
  - 10 Classes (Class 1-10)
  - 20 Sections (A & B for each class)
  - 14 Subjects (Math, English, Science, Computer Science, etc.)
  - 25 Teachers with assigned subjects
  - 200-300 Students with linked parent accounts
  - All with realistic mock data for testing

### **School Branding**
- ✅ **Logo Upload**: Upload actual image files (PNG, JPG) - max 5MB
- ✅ **Logo Display**: School logo appears in:
  - Login pages
  - Dashboard headers
  - PDF receipts
  - All school-branded documents
- ✅ **Principal Name**: Set principal name when creating school
- ✅ **Owner/Admin Name**: Set owner or admin name for signature on documents
- ✅ **Principal in PDFs**: Principal name appears on all receipts and documents
- ✅ **Owner/Admin Signature**: Owner/Admin name appears at bottom of all PDFs with signature line

### **Subscription & Revenue Management** (Super Admin)
- ✅ **Monthly subscription** tracking per school
- ✅ **Revenue calculation**: Monthly & Total (in PKR)
- ✅ **Subscription status**: Active, Expired, Due Soon, Pending
- ✅ **Visual notifications** for due/expired subscriptions
- ✅ Automated billing cycle (monthly)
- ✅ Custom subscription amount per school

### **Financial Handover System** (Management → Admin)
- ✅ Management can hand over collected fees to Admin
- ✅ Admin view shows: Amount, Management User, Timestamp
- ✅ Complete handover history
- ✅ Dynamic backup calculation

### **Leave Approval System**
- ✅ **Teachers** can request leave for themselves
- ✅ **Parents** can request leave for their child
- ✅ **Management & Admin** can approve or reject leaves
- ✅ Status: Pending, Approved, Rejected

### **PDF Payment Receipts & Reports**
- ✅ **Download receipts** as PDF
- ✅ **Print-ready** format
- ✅ **School-branded** with:
  - **School logo** at top (if uploaded)
  - **School name** prominently displayed (large, bold, uppercase)
  - **Principal name** (if set)
  - School address, phone, email
- ✅ **All PDF Reports** include:
  - School branding at top
  - **Owner/Admin signature section** at bottom
  - **Legal disclaimer**: "This is a computer-generated document. Errors and omissions are accepted. Cannot be challenged in court."
  - Professional layout with proper spacing
- ✅ Includes:
  - Student information
  - Payment details
  - Receipt number and timestamp
  - Signature line with owner/admin name

### **Password Management**
- ✅ **Super Admin** sets admin passwords (cannot be changed by admin)
- ✅ **Admin** sets Management passwords
- ✅ **Admin & Management** set Teacher and Parent passwords
- ✅ **Passwords cannot be changed** after creation (security feature)
- ✅ All passwords are **hardcoded** (frontend-only limitation)

### **User Management**
- ✅ Role-based CRUD operations
- ✅ Hardcoded passwords (frontend only)
- ✅ Email required for Management and Teachers
- ✅ Email **optional** for Students (no login)
- ✅ School-specific data isolation

### **Modern UI/UX**
- ✅ **Stunning login pages** with animated gradients
- ✅ **School-specific login pages** with school branding
- ✅ Glassmorphism effects
- ✅ Dark mode support (improved contrast)
- ✅ Fully responsive (desktop, tablet, mobile)
- ✅ Smooth animations and micro-interactions

---

## 📁 **Architecture & Folder Structure**

```
src/
├── components/
│   ├── common/           # Reusable UI components
│   │   ├── Avatar.jsx
│   │   ├── Breadcrumb.jsx
│   │   ├── Loading.jsx
│   │   ├── Modal.jsx
│   │   └── CSVImport.jsx
│   ├── layout/           # Layout components
│   │   ├── DashboardLayout.jsx
│   │   ├── Header.jsx (shows school logo)
│   │   └── Sidebar.jsx
│   └── [module]/         # Module-specific components
├── pages/
│   ├── auth/             # Authentication
│   │   ├── LoginPage.jsx (main login)
│   │   ├── SuperAdminLoginPage.jsx (/superadmin)
│   │   └── SchoolLoginPage.jsx (/{school-slug}/signin)
│   ├── schools/          # Schools management (Super Admin)
│   ├── dashboard/        # Role-based dashboards
│   ├── students/         # Student management
│   ├── teachers/         # Teacher management
│   ├── fees/             # Fee management & receipts
│   ├── leave/            # Leave management
│   └── ...
├── store/                # Zustand state management
│   └── index.js          # All stores (auth, students, schools, fees, etc.)
├── services/             # API services (mock data)
│   └── mockData.js
├── utils/                # Utility functions
│   ├── index.js          # Helper functions
│   ├── pdfGenerator.js   # PDF receipt generation (school-branded)
│   └── schoolDataGenerator.js  # Auto-generate school data
├── constants/            # Application constants
│   └── index.js          # Roles, statuses, navigation
├── App.jsx               # Main app with routing
├── main.jsx              # Entry point
└── index.css             # Global styles
```

---

## 🔧 **Tech Stack**

| Category | Technology |
|----------|------------|
| **Core** | React 19 + Vite |
| **Routing** | React Router DOM |
| **State Management** | Zustand (with persistence) |
| **Styling** | Vanilla CSS (design system) |
| **Icons** | Lucide React |
| **Charts** | Recharts |
| **Notifications** | React Hot Toast |
| **PDF Generation** | jsPDF |
| **Date Handling** | date-fns |

---

## 🏁 **Getting Started**

### **Prerequisites**
- Node.js (v16 or higher)
- npm or yarn

### **Installation**

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

---

## 🔐 **Demo Credentials**

### **Super Admin**
- **URL**: `/superadmin/login`
- **Email:** superadmin@school.com
- **Password:** superadmin123

### **School Admin**
- **URL**: `/login` or `/{school-slug}/signin`
- **Email:** admin@school.com
- **Password:** admin123

### **Management (Principal)**
- **URL**: `/login` or `/{school-slug}/signin`
- **Email:** principal@school.com  
- **Password:** principal123

### **Teacher**
- **URL**: `/login` or `/{school-slug}/signin`
- **Email:** teacher@school.com
- **Password:** teacher123

### **Parent**
- **URL**: `/login` or `/{school-slug}/signin`
- **Email:** parent@school.com
- **Password:** parent123

---

## 📊 **Multi-School Workflow**

1. **Super Admin logs in** at `/superadmin`
2. **Adds a new school** with:
   - School name (auto-generates slug: `al-abbas-college`)
   - Principal name
   - Logo file upload
   - Subscription amount
   - Admin email and password
3. **System auto-generates**:
   - 10 Classes, 20 Sections, 14 Subjects
   - 25 Teachers with subjects
   - 200-300 Students with parent accounts
4. **School Admin logs in** at `/{school-slug}/signin` (e.g., `/al-abbas-college/signin`)
5. **Admin adds Management** users (1, 2, or more) with passwords
6. **Admin/Management add** Teachers and Parents with passwords
7. Each school's data is **completely isolated**

---

## 💰 **Subscription & Revenue Logic**

- Each school has a **monthly subscription fee** (set by Super Admin)
- **Subscription start date** sets the billing cycle
- **Next billing date** = Start date + 1 month (recurring)
- **Status indicators**:
  - 🟢 **Active**: Subscription is up to date
  - 🟡 **Due Soon**: Billing date within 7 days
  - 🔴 **Expired**: Billing date has passed
- **Monthly Revenue** = Sum of all active subscriptions (PKR)
- **Total Revenue** = Subscription amount × months since start (all schools) (PKR)

---

## 📝 **Leave Management Workflow**

1. **Teachers** request leave for themselves
2. **Parents** request leave for their child
3. **Management/Admin** sees all pending leave requests
4. Management/Admin can **approve or reject**
5. Status updates: Pending → Approved/Rejected

---

## 🧾 **Payment Receipt Workflow**

1. Admin/Management collects fee payment
2. Payment is recorded in the system
3. **Download PDF Receipt** button generates:
   - **School-branded PDF** with:
     - School logo (if uploaded)
     - School name
     - Principal name
     - School contact information
   - Student details
   - Payment information
   - Receipt number
4. Receipt can be **printed** for physical records
5. All amounts displayed in **PKR**

---

## 🎨 **School-Specific Features**

### **Logo Management**
- Upload logo file (PNG, JPG) - max 5MB
- Logo appears in:
  - School login page
  - Dashboard header
  - PDF receipts
  - All school documents

### **Principal Name**
- Set when creating school
- Appears on:
  - PDF receipts
  - School documents
  - Login page (optional)

### **School URLs**
- Each school gets a unique slug from school name
- Login URL: `/{school-slug}/signin`
- Example: `/al-abbas-college/signin`
- School-specific branding on login page

---

## 🔒 **Authentication & Security**

> **Frontend-Only Limitation**

- All passwords are **hardcoded** (for demo purposes)
- No real authentication backend
- No password reset or email verification
- Data is stored in browser **localStorage** (Zustand persist)
- **Password Management**:
  - Super Admin sets admin passwords (cannot be changed)
  - Admin sets Management passwords
  - Admin/Management set Teacher/Parent passwords
  - Passwords cannot be changed after creation
- In production, replace with:
  - JWT authentication
  - Backend API integration
  - Secure password hashing
  - Password reset functionality

---

## 📦 **Data Storage**

### **LocalStorage Keys**
- `auth-storage`: User authentication
- `theme-storage`: Theme preference
- `school_data_{schoolId}`: School-specific data (classes, students, teachers, etc.)
- `school_logo_{schoolId}`: School logo (base64)
- `management-users`: Management users created by Admin

### **Data Isolation**
- Each school's data is stored separately
- Data is filtered by `schoolId` in all queries
- Super Admin can see all schools
- School users only see their school's data

---

## 🎨 **Design System**

- **CSS Variables** for theming
- **Reusable utility classes**
- **Consistent spacing and typography**
- **Responsive breakpoints**
- **Dark mode support** (improved contrast)
- **Smooth animations and transitions**

---

## 📦 **Production Build**

```bash
npm run build
```

The optimized production bundle will be in the `dist` folder.

---

## 🔮 **Scalability & Future Extensibility**

This system is designed for **easy extension**:

### **Ready to Add:**
- ✅ Multiple campuses per school
- ✅ Advanced fee structures
- ✅ Exam scheduling and report cards
- ✅ Payroll management
- ✅ More user roles (Accountant, Librarian, etc.)
- ✅ Real backend API integration
- ✅ Email/SMS notifications
- ✅ Online payment gateway
- ✅ Multi-language support

### **Architecture Benefits:**
- Component-based design
- Centralized state management
- Modular folder structure
- Separation of concerns
- Clean, documented code
- School-specific data isolation

---

## 🛠️ **Adding New Modules**

1. Create page component in `src/pages/<module>/`
2. Create related components in `src/components/<module>/`
3. Add store in `src/store/index.js`
4. Add route in `src/App.jsx`
5. Update navigation in `src/constants/index.js`
6. Ensure school-specific filtering if needed

---

## 📚 **Code Quality Standards**

- ✅ **Component-based architecture**
- ✅ **Reusable utility functions**
- ✅ **Consistent naming conventions**
- ✅ **Proper error handling**
- ✅ **Form validation**
- ✅ **No dead code**
- ✅ **No duplicate logic**
- ✅ **Production-ready structure**
- ✅ **School-specific data isolation**

---

## 🎯 **Key Principles**

1. **Multi-school from Day 1** — Not an afterthought
2. **Production-grade code** — No shortcuts
3. **Scalable architecture** — Easy to extend
4. **Clean state management** — Centralized with Zustand
5. **Role-based everything** — UI, data, and features
6. **Frontend-only** — Clear separation of concerns
7. **School isolation** — Complete data separation
8. **Auto-generation** — Comprehensive mock data for testing

---

## 💡 **Important Notes**

- This is **frontend only** — no backend server
- Authentication is **hardcoded** for demonstration
- Data is stored in **browser local storage**
- PDF generation requires **jsPDF** library
- Multi-school support is **UI-level separation** with localStorage
- **School logos** are stored as base64 in localStorage
- **Principal names** are stored with school data
- For production, integrate with a real backend

---

## 📞 **Support & Contact**

For questions or support:
- **Email:** info@alabbascollege.edu.pk
- **Phone:** +92 300 1234567
- **Address:** Shah Jamal, Lahore

---

**Built with ❤️ for AL-ABBAS COLLEGE OF SCIENCE AND ARTS**

*Excellence in Education, Building Tomorrow's Leaders*
