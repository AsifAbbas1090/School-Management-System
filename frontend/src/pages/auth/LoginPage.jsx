import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../store';
import { authService } from '../../services/api';
import { USER_ROLES, SCHOOL_INFO } from '../../constants';
import toast from 'react-hot-toast';

const roleOptions = [
  { value: USER_ROLES.ADMIN,      label: 'School Admin' },
  { value: USER_ROLES.MANAGEMENT, label: 'Management'   },
  { value: USER_ROLES.TEACHER,    label: 'Teacher'      },
  { value: USER_ROLES.PARENT,     label: 'Parent'       },
];

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [formData, setFormData]   = useState({ role: USER_ROLES.ADMIN, email: '', password: '' });
  const [showPassword, setShowPw] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [errors, setErrors]       = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!formData.email)    e.email    = 'Email is required';
    if (!formData.password) e.password = 'Password is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await authService.login(formData.email, formData.password);
      if (res.success && res.data) {
        login({
          ...res.data.user,
          role: res.data.user.role?.toUpperCase(),
          accessToken: res.data.accessToken,
          refreshToken: res.data.refreshToken,
        });
        toast.success('Welcome back!');
        navigate('/dashboard');
      } else {
        toast.error(res.error || 'Invalid credentials');
      }
    } catch (err) {
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lp-root">
      {/* Subtle background blobs */}
      <div className="lp-blob lp-blob-1" />
      <div className="lp-blob lp-blob-2" />

      <div className="lp-card">
        {/* Logo mark */}
        <div className="lp-logo">
          <div className="lp-logo-ring">
            <GraduationCap size={26} />
          </div>
        </div>

        {/* Heading */}
        <div className="lp-head">
          <h1 className="lp-title">Sign in</h1>
          <p className="lp-sub">{SCHOOL_INFO.name}</p>
        </div>

        {/* Role tabs */}
        <div className="lp-roles">
          {roleOptions.map(r => (
            <button
              key={r.value}
              type="button"
              className={`lp-role-btn ${formData.role === r.value ? 'active' : ''}`}
              onClick={() => setFormData(p => ({ ...p, role: r.value }))}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="lp-form" noValidate>
          <div className="lp-field">
            <label className="lp-label">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`lp-input${errors.email ? ' lp-input-err' : ''}`}
              placeholder="you@example.com"
              autoComplete="email"
            />
            {errors.email && <span className="lp-err">{errors.email}</span>}
          </div>

          <div className="lp-field">
            <div className="lp-label-row">
              <label className="lp-label">Password</label>
              <Link to="/forgot-password" className="lp-forgot">Forgot password?</Link>
            </div>
            <div className="lp-pw-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`lp-input${errors.password ? ' lp-input-err' : ''}`}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="lp-pw-toggle"
                onClick={() => setShowPw(v => !v)}
                aria-label="Toggle password"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <span className="lp-err">{errors.password}</span>}
          </div>

          <button type="submit" className="lp-submit" disabled={loading}>
            {loading ? (
              <span className="lp-spinner" />
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>

      <style>{`
        /* ── Root ── */
        .lp-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5f5f7;
          padding: 1.5rem;
          position: relative;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
        }

        /* Subtle decorative blobs */
        .lp-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.35;
          pointer-events: none;
        }
        .lp-blob-1 {
          width: 480px; height: 480px;
          background: radial-gradient(circle, #c7d7fe, #a5b4fc);
          top: -120px; left: -100px;
        }
        .lp-blob-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, #fde4cf, #fbcfe8);
          bottom: -80px; right: -80px;
        }

        /* ── Card ── */
        .lp-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          background: #ffffff;
          border-radius: 20px;
          padding: 2.5rem 2.25rem 2rem;
          box-shadow:
            0 0 0 1px rgba(0,0,0,0.06),
            0 4px 6px -1px rgba(0,0,0,0.05),
            0 16px 40px -4px rgba(0,0,0,0.10);
          animation: lp-rise 0.45s cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes lp-rise {
          from { opacity: 0; transform: translateY(18px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)     scale(1);    }
        }

        /* ── Logo ── */
        .lp-logo {
          display: flex;
          justify-content: center;
          margin-bottom: 1.5rem;
        }
        .lp-logo-ring {
          width: 52px; height: 52px;
          border-radius: 14px;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: 0 4px 14px rgba(99,102,241,0.4);
        }

        /* ── Heading ── */
        .lp-head { text-align: center; margin-bottom: 1.75rem; }
        .lp-title {
          font-size: 1.625rem;
          font-weight: 700;
          letter-spacing: -0.4px;
          color: #111827;
          margin-bottom: 0.3rem;
        }
        .lp-sub {
          font-size: 0.8125rem;
          color: #6b7280;
          line-height: 1.4;
          max-width: 300px;
          margin: 0 auto;
        }

        /* ── Role tabs ── */
        .lp-roles {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.375rem;
          background: #f3f4f6;
          border-radius: 10px;
          padding: 0.25rem;
          margin-bottom: 1.75rem;
        }
        .lp-role-btn {
          padding: 0.45rem 0.5rem;
          font-size: 0.8rem;
          font-weight: 500;
          border-radius: 7px;
          border: none;
          background: transparent;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .lp-role-btn:hover { color: #111827; background: rgba(255,255,255,0.7); }
        .lp-role-btn.active {
          background: #ffffff;
          color: #111827;
          font-weight: 600;
          box-shadow: 0 1px 3px rgba(0,0,0,0.12);
        }

        /* ── Form ── */
        .lp-form { display: flex; flex-direction: column; gap: 1.125rem; }

        .lp-field { display: flex; flex-direction: column; gap: 0.375rem; }

        .lp-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .lp-label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #374151;
        }
        .lp-forgot {
          font-size: 0.75rem;
          color: #6366f1;
          font-weight: 500;
          text-decoration: none;
        }
        .lp-forgot:hover { text-decoration: underline; }

        .lp-input {
          width: 100%;
          height: 42px;
          padding: 0 0.875rem;
          font-size: 0.875rem;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          background: #fafafa;
          color: #111827;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
          box-sizing: border-box;
        }
        .lp-input::placeholder { color: #9ca3af; }
        .lp-input:focus {
          border-color: #6366f1;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }
        .lp-input-err {
          border-color: #ef4444 !important;
          box-shadow: 0 0 0 3px rgba(239,68,68,0.10) !important;
        }
        .lp-err {
          font-size: 0.75rem;
          color: #ef4444;
          margin-top: 0.125rem;
        }

        .lp-pw-wrap { position: relative; }
        .lp-pw-wrap .lp-input { padding-right: 2.75rem; }
        .lp-pw-toggle {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0.25rem;
          transition: color 0.15s;
        }
        .lp-pw-toggle:hover { color: #6366f1; }

        /* ── Submit ── */
        .lp-submit {
          height: 44px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.25rem;
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          color: #fff;
          font-size: 0.9rem;
          font-weight: 600;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          letter-spacing: 0.01em;
          transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 2px 8px rgba(99,102,241,0.35);
        }
        .lp-submit:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(99,102,241,0.45);
        }
        .lp-submit:active:not(:disabled) { transform: translateY(0); }
        .lp-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Inline spinner */
        .lp-spinner {
          width: 18px; height: 18px;
          border: 2.5px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: lp-spin 0.65s linear infinite;
        }
        @keyframes lp-spin { to { transform: rotate(360deg); } }

        /* ── Mobile ── */
        @media (max-width: 480px) {
          .lp-card { padding: 2rem 1.5rem 1.75rem; border-radius: 16px; }
          .lp-title { font-size: 1.4rem; }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
