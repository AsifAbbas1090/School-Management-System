# Git Commands for Deployment

## 🚀 **Initial Setup** (if repository not initialized)

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Multi-School Management System - Production Ready"
```

## 📤 **Push to Remote Repository**

### **First Time Setup**
```bash
# Add remote repository (replace with your repository URL)
git remote add origin <your-repository-url>

# Example:
# git remote add origin https://github.com/yourusername/academy.git
# OR
# git remote add origin git@github.com:yourusername/academy.git

# Push to main branch
git push -u origin main

# If your default branch is master:
git push -u origin master
```

### **Update Existing Repository**
```bash
# Check current status
git status

# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: Enhanced Schools Management UI and PDF branding

- Improved Schools Management page with modern card designs and gradients
- Enhanced statistics cards with icons and hover effects
- Updated PDF reports with complete school branding (logo, name, signature, disclaimer)
- Added owner/admin name field for document signatures
- Fixed monthly fee display in student reports
- Updated README with complete feature documentation
- Removed old school registration form from SuperAdminDashboard
- Changed Super Admin login URL to /superadmin/login
- Professional UI improvements with animations and modern styling"

# Push to remote
git push origin main
```

## 🌿 **Create Feature Branch**
```bash
# Create and switch to new branch
git checkout -b feature/enhanced-ui

# Make changes, then commit
git add .
git commit -m "feat: Enhanced UI improvements"

# Push branch to remote
git push origin feature/enhanced-ui

# Merge to main (after review)
git checkout main
git merge feature/enhanced-ui
git push origin main
```

## 📋 **Useful Git Commands**

```bash
# Check current branch
git branch

# View commit history
git log --oneline

# View changes
git diff

# Discard local changes (be careful!)
git checkout -- .

# Pull latest changes
git pull origin main

# View remote repositories
git remote -v
```

## ⚠️ **Important Notes**

- Always commit with meaningful messages
- Test your changes before pushing
- Use feature branches for major changes
- Keep commits focused and atomic
- Review changes with `git status` and `git diff` before committing

