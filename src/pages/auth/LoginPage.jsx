import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuthStore } from '../../store';
import { authService } from '../../services/mockData';
import { USER_ROLES, SCHOOL_INFO } from '../../constants';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [formData, setFormData] = useState({
    role: USER_ROLES.ADMIN,
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      const response = await authService.login(formData.email, formData.password);

      if (response.success) {
        login(response.data);
        toast.success('Login successful!');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: USER_ROLES.ADMIN, label: 'School Admin', credentials: 'admin@school.com / admin123' },
    { value: USER_ROLES.MANAGEMENT, label: 'Management', credentials: 'principal@school.com / principal123' },
    { value: USER_ROLES.TEACHER, label: 'Teacher', credentials: 'teacher@school.com / teacher123' },
    { value: USER_ROLES.PARENT, label: 'Parent', credentials: 'parent@school.com / parent123' },
  ];

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left Side - Branding */}
        <div className="login-branding">
          <div className="branding-content">
            <div className="logo-section">
              <div className="logo-icon">
                <GraduationCap size={64} />
              </div>
              <h1 className="school-name">{SCHOOL_INFO.name}</h1>
              <p className="school-tagline">{SCHOOL_INFO.tagline}</p>
            </div>

            <div className="features">
              <div className="feature-item">
                <div className="feature-icon">✓</div>
                <div>
                  <h3>Complete Management</h3>
                  <p>Manage students, teachers, and all school operations</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">✓</div>
                <div>
                  <h3>Real-time Tracking</h3>
                  <p>Track attendance, fees, and academic performance</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">✓</div>
                <div>
                  <h3>Smart Communication</h3>
                  <p>Seamless communication between all stakeholders</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-form-section">
          <div className="form-container">
            <div className="form-header">
              <h2>Welcome Back</h2>
              <p>Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label className="form-label">Select Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="select"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  placeholder="Enter your email"
                />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="password-input">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`input ${errors.password ? 'input-error' : ''}`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <span className="form-error">{errors.password}</span>}
              </div>

              <div className="form-actions">
                <Link to="/forgot-password" className="forgot-link">
                  Forgot Password?
                </Link>
              </div>

              <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
                {loading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <LogIn size={20} />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>

            {/* Demo Credentials */}
            <div className="demo-credentials">
              <p className="demo-title">Demo Credentials:</p>
              {roleOptions.map((option) => (
                <div key={option.value} className="demo-item">
                  <strong>{option.label}:</strong> {option.credentials}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 25%, #8b5cf6 50%, #a855f7 75%, #ec4899 100%);
          background-size: 400% 400%;
          animation: gradientShift 15s ease infinite;
          padding: var(--spacing-lg);
          position: relative;
          overflow: hidden;
        }

        .login-page::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3), transparent 50%),
                      radial-gradient(circle at 80% 80%, rgba(255, 128, 171, 0.3), transparent 50%),
                      radial-gradient(circle at 40% 80%, rgba(79, 172, 254, 0.3), transparent 50%);
          animation: pulse 8s ease-in-out infinite;
          z-index: 0;
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .login-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          max-width: 1200px;
          width: 100%;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 32px 64px rgba(0, 0, 0, 0.2),
                      0 16px 32px rgba(0, 0, 0, 0.15),
                      inset 0 0 0 1px rgba(255, 255, 255, 0.8);
          position: relative;
          z-index: 1;
          animation: fadeInScale 0.5s ease-out;
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .login-branding {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 30%, #8b5cf6 70%, #a855f7 100%);
          color: white;
          padding: var(--spacing-3xl);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .login-branding::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
          animation: backgroundMove 20s linear infinite;
        }

        @keyframes backgroundMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }

        .branding-content {
          max-width: 400px;
          position: relative;
          z-index: 1;
        }

        .logo-section {
          text-align: center;
          margin-bottom: var(--spacing-3xl);
          animation: fadeInDown 0.8s ease-out;
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .logo-icon {
          width: 100px;
          height: 100px;
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto var(--spacing-lg);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease;
        }

        .logo-icon:hover {
          transform: scale(1.05) rotate(5deg);
        }

        .school-name {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: var(--spacing-sm);
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          line-height: 1.3;
        }

        .school-tagline {
          font-size: 1rem;
          opacity: 0.95;
          font-weight: 500;
        }

        .features {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
          animation: fadeInUp 1s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .feature-item {
          display: flex;
          gap: var(--spacing-md);
          align-items: flex-start;
          transition: transform 0.2s ease;
        }

        .feature-item:hover {
          transform: translateX(5px);
        }

        .feature-icon {
          width: 36px;
          height: 36px;
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(10px);
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.125rem;
          flex-shrink: 0;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        }

        .feature-item h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .feature-item p {
          font-size: 0.875rem;
          opacity: 0.9;
          margin: 0;
          line-height: 1.5;
        }

        .login-form-section {
          padding: var(--spacing-3xl);
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
        }

        .form-container {
          width: 100%;
          max-width: 400px;
        }

        .form-header {
          text-align: center;
          margin-bottom: var(--spacing-2xl);
        }

        .form-header h2 {
          font-size: 2rem;
          font-weight: 700;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: var(--spacing-sm);
        }

        .form-header p {
          color: var(--gray-600);
          margin: 0;
          font-size: 1rem;
        }

        .login-form {
          margin-bottom: var(--spacing-xl);
        }

        .password-input {
          position: relative;
        }

        .password-toggle {
          position: absolute;
          right: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--gray-400);
          cursor: pointer;
          padding: var(--spacing-xs);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease;
        }

        .password-toggle:hover {
          color: #3b82f6;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          margin-bottom: var(--spacing-lg);
        }

        .forgot-link {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-size: 0.875rem;
          font-weight: 600;
          transition: opacity 0.2s ease;
        }

        .forgot-link:hover {
          opacity: 0.8;
          text-decoration: underline;
        }

        .demo-credentials {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border-radius: 16px;
          padding: var(--spacing-lg);
          border: 1px solid rgba(59, 130, 246, 0.2);
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.08);
        }

        .demo-title {
          font-size: 0.875rem;
          font-weight: 700;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: var(--spacing-md);
        }

        .demo-item {
          font-size: 0.75rem;
          color: var(--gray-700);
          margin-bottom: 0.5rem;
          padding: 0.375rem 0;
          border-bottom: 1px solid rgba(102, 126, 234, 0.08);
        }

        .demo-item:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }

        .demo-item strong {
          color: #3b82f6;
          font-weight: 600;
          display: inline-block;
          min-width: 110px;
        }

        @media (max-width: 1024px) {
          .login-container {
            grid-template-columns: 1fr;
          }

          .login-branding {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .login-page {
            padding: var(--spacing-md);
          }

          .login-form-section {
            padding: var(--spacing-xl);
          }

          .form-header h2 {
            font-size: 1.75rem;
          }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
