import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Eye, EyeOff, Server, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../store';
import { authService } from '../../services/mockData';
import { USER_ROLES } from '../../constants';
import toast from 'react-hot-toast';

const SuperAdminLoginPage = () => {
    const navigate = useNavigate();
    const { login } = useAuthStore();

    const [email, setEmail] = useState('superadmin@school.com');
    const [password, setPassword] = useState('superadmin123');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Force role check logic if needed, but for now authService handles credentials match
            const response = await authService.login(email, password);
            if (response.success && response.data.role === USER_ROLES.SUPER_ADMIN) {
                login(response.data);
                toast.success('System Access Granted');
                navigate('/dashboard');
            } else {
                toast.error('Unauthorized Access: Not a Super Admin account');
            }
        } catch (error) {
            toast.error(error.message || 'Access Denied');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="super-admin-login">
            <div className="login-card">
                <div className="header-section">
                    <div className="icon-container">
                        <Shield size={48} className="text-white" />
                    </div>
                    <h1>System Administration</h1>
                    <p>Enter your super admin credentials to access the master control panel.</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label>
                            <Server size={16} />
                            <span>System ID / Email</span>
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@system.internal"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>
                            <Lock size={16} />
                            <span>Secure Key</span>
                        </label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="toggle-password"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? 'Authenticating...' : (
                            <>
                                <span>Access Control Panel</span>
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>

                    <div className="text-center mt-6">
                        <a href="/login" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                            Return to School Portal
                        </a>
                    </div>
                </form>
            </div>

            <style>{`
                .super-admin-login {
                    min-height: 100vh;
                    background: #111827; /* Dark background */
                    background-image: radial-gradient(circle at 50% 50%, #1f2937 0%, #111827 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    font-family: 'Inter', sans-serif;
                }

                .login-card {
                    background: rgba(31, 41, 55, 0.7);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 24px;
                    width: 100%;
                    max-width: 480px;
                    padding: 48px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    animation: slideUp 0.5s ease-out;
                }

                .header-section {
                    text-align: center;
                    margin-bottom: 40px;
                }

                .icon-container {
                    width: 80px;
                    height: 80px;
                    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                    border-radius: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 24px;
                    box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.5);
                }

                h1 {
                    color: white;
                    font-size: 24px;
                    font-weight: 700;
                    margin-bottom: 8px;
                    letter-spacing: -0.5px;
                }

                p {
                    color: #9ca3af;
                    font-size: 14px;
                    line-height: 1.5;
                }

                .form-group {
                    margin-bottom: 24px;
                }

                .form-group label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #e5e7eb;
                    font-size: 14px;
                    font-weight: 500;
                    margin-bottom: 8px;
                }

                input {
                    width: 100%;
                    background: rgba(17, 24, 39, 0.8);
                    border: 1px solid rgba(75, 85, 99, 0.5);
                    border-radius: 12px;
                    padding: 12px 16px;
                    color: white;
                    font-size: 15px;
                    transition: all 0.2s;
                }

                input:focus {
                    outline: none;
                    border-color: #8b5cf6;
                    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
                    background: rgba(17, 24, 39, 1);
                }

                .password-input-wrapper {
                    position: relative;
                }

                .toggle-password {
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: #9ca3af;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: color 0.2s;
                }

                .toggle-password:hover {
                    color: white;
                }

                .submit-btn {
                    width: 100%;
                    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    padding: 14px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: transform 0.2s, box-shadow 0.2s;
                    margin-top: 32px;
                }

                .submit-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px -5px rgba(139, 92, 246, 0.3);
                }

                .submit-btn:active {
                    transform: translateY(0);
                }
                
                .submit-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                    transform: none;
                }

                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default SuperAdminLoginPage;
