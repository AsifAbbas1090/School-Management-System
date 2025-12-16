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
        email: 'admin@school.com',
        password: 'admin123',
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
        { value: USER_ROLES.ADMIN, label: 'Admin', credentials: 'admin@school.com / admin123' },
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

            <style jsx>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--primary-600), var(--secondary-600));
          padding: var(--spacing-lg);
        }

        .login-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          max-width: 1200px;
          width: 100%;
          background: white;
          border-radius: var(--radius-2xl);
          overflow: hidden;
          box-shadow: var(--shadow-2xl);
        }

        .login-branding {
          background: linear-gradient(135deg, var(--primary-600), var(--secondary-600));
          color: white;
          padding: var(--spacing-3xl);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .branding-content {
          max-width: 400px;
        }

        .logo-section {
          text-align: center;
          margin-bottom: var(--spacing-3xl);
        }

        .logo-icon {
          width: 100px;
          height: 100px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border-radius: var(--radius-2xl);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto var(--spacing-lg);
        }

        .school-name {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: var(--spacing-sm);
        }

        .school-tagline {
          font-size: 1rem;
          opacity: 0.9;
        }

        .features {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .feature-item {
          display: flex;
          gap: var(--spacing-md);
          align-items: flex-start;
        }

        .feature-icon {
          width: 32px;
          height: 32px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          flex-shrink: 0;
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
        }

        .login-form-section {
          padding: var(--spacing-3xl);
          display: flex;
          align-items: center;
          justify-content: center;
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
          font-size: 1.875rem;
          font-weight: 700;
          color: var(--gray-900);
          margin-bottom: var(--spacing-sm);
        }

        .form-header p {
          color: var(--gray-600);
          margin: 0;
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
        }

        .password-toggle:hover {
          color: var(--gray-600);
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          margin-bottom: var(--spacing-lg);
        }

        .forgot-link {
          color: var(--primary-600);
          font-size: 0.875rem;
          font-weight: 500;
        }

        .forgot-link:hover {
          color: var(--primary-700);
          text-decoration: underline;
        }

        .demo-credentials {
          background: var(--gray-50);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
          border: 1px solid var(--gray-200);
        }

        .demo-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--gray-700);
          margin-bottom: var(--spacing-sm);
        }

        .demo-item {
          font-size: 0.75rem;
          color: var(--gray-600);
          margin-bottom: 0.25rem;
        }

        .demo-item strong {
          color: var(--gray-900);
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
        }
      `}</style>
        </div>
    );
};

export default LoginPage;
