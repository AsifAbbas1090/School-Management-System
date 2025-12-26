import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, LogIn, Building } from 'lucide-react';
import { useAuthStore, useSchoolStore } from '../../store';
import { authService } from '../../services/api';
import { USER_ROLES } from '../../constants';
import toast from 'react-hot-toast';

const SchoolLoginPage = () => {
    const navigate = useNavigate();
    const { schoolSlug } = useParams();
    const { login } = useAuthStore();
    const { schools, setCurrentSchool } = useSchoolStore();

    const [formData, setFormData] = useState({
        role: USER_ROLES.ADMIN,
        email: '',
        password: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [school, setSchool] = useState(null);

    useEffect(() => {
        // Find school by slug
        const foundSchool = schools.find(s => s.slug === schoolSlug);
        if (foundSchool) {
            setSchool(foundSchool);
            setCurrentSchool(foundSchool);
        } else {
            toast.error('School not found');
            setTimeout(() => navigate('/login'), 2000);
        }
    }, [schoolSlug, schools, setCurrentSchool, navigate]);

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
            const response = await authService.login(formData.email, formData.password, school.id);

            if (response.success && response.data) {
                // Backend returns { accessToken, refreshToken, user }
                const userData = {
                    ...response.data.user,
                    accessToken: response.data.accessToken,
                    refreshToken: response.data.refreshToken,
                };
                
                // Verify user belongs to this school
                if (userData.schoolId && userData.schoolId !== school.id) {
                    toast.error('User does not belong to this school');
                    return;
                }
                
                login(userData);
                setCurrentSchool(school);
                toast.success(`Welcome to ${school.name}!`);
                navigate('/dashboard');
            } else {
                toast.error(response.error || 'Invalid credentials');
            }
        } catch (error) {
            toast.error(error.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    const roleOptions = [
        { value: USER_ROLES.ADMIN, label: 'School Admin' },
        { value: USER_ROLES.MANAGEMENT, label: 'Management' },
        { value: USER_ROLES.TEACHER, label: 'Teacher' },
        { value: USER_ROLES.PARENT, label: 'Parent' },
    ];

    if (!school) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Building size={48} className="mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">Loading school information...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="login-page">
            <div className="login-container">
                {/* Left Side - Branding */}
                <div className="login-branding">
                    <div className="branding-content">
                        <div className="logo-section">
                            {school.logo ? (
                                <div className="logo-icon">
                                    <img src={school.logo} alt={school.name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '24px' }} />
                                </div>
                            ) : (
                                <div className="logo-icon">
                                    <GraduationCap size={64} />
                                </div>
                            )}
                            <h1 className="school-name">{school.name}</h1>
                            {school.principalName && (
                                <p className="school-tagline">Principal: {school.principalName}</p>
                            )}
                        </div>

                        <div className="features">
                            <div className="feature-item">
                                <div className="feature-icon">✓</div>
                                <div>
                                    <h3>School Portal</h3>
                                    <p>Access your school management system</p>
                                </div>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon">✓</div>
                                <div>
                                    <h3>Secure Access</h3>
                                    <p>Login with your credentials</p>
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
                            <p>Sign in to {school.name}</p>
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

                        <div className="text-center mt-4">
                            <a href="/login" className="text-sm text-gray-500 hover:text-primary-600">
                                Back to Main Portal
                            </a>
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

                @keyframes gradientShift {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
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
                    box-shadow: 0 32px 64px rgba(0, 0, 0, 0.2);
                    position: relative;
                    z-index: 1;
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

                .branding-content {
                    max-width: 400px;
                    position: relative;
                    z-index: 1;
                }

                .logo-section {
                    text-align: center;
                    margin-bottom: var(--spacing-3xl);
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
                }

                .school-name {
                    font-size: 1.75rem;
                    font-weight: 700;
                    margin-bottom: var(--spacing-sm);
                    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
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
                }

                .feature-item {
                    display: flex;
                    gap: var(--spacing-md);
                    align-items: flex-start;
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
                    flex-shrink: 0;
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
                }

                @media (max-width: 1024px) {
                    .login-container {
                        grid-template-columns: 1fr;
                    }
                    .login-branding {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
};

export default SchoolLoginPage;

