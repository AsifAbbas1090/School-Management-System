import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, ArrowRight, BookOpen, Users, BarChart3, Shield } from 'lucide-react';
import { useAuthStore } from '../../store';
import { authService } from '../../services/api';
import { USER_ROLES, SCHOOL_INFO } from '../../constants';
import toast from 'react-hot-toast';

const roleOptions = [
  { value: USER_ROLES.ADMIN,      label: 'Admin'      },
  { value: USER_ROLES.MANAGEMENT, label: 'Management' },
  { value: USER_ROLES.TEACHER,    label: 'Teacher'    },
  { value: USER_ROLES.PARENT,     label: 'Parent'     },
];

const features = [
  { icon: Users,    text: 'Student & staff management' },
  { icon: BarChart3,text: 'Real-time analytics & reports' },
  { icon: BookOpen, text: 'Attendance, exams & fees' },
  { icon: Shield,   text: 'Role-based secure access' },
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
      {/* ── Left panel ── */}
      <div className="lp-left">
        {/* Noise texture overlay */}
        <div className="lp-noise" />

        {/* Floating orbs */}
        <div className="lp-orb lp-orb-1" />
        <div className="lp-orb lp-orb-2" />
        <div className="lp-orb lp-orb-3" />

        <div className="lp-left-inner">
          {/* Brand */}
          <div className="lp-brand">
            <div className="lp-brand-icon">
              <GraduationCap size={22} />
            </div>
            <span className="lp-brand-name">SMS</span>
          </div>

          {/* Hero copy */}
          <div className="lp-hero">
            <p className="lp-hero-eyebrow">School Management Platform</p>
            <h1 className="lp-hero-title">
              Everything your<br />school needs,<br />
              <em>in one place.</em>
            </h1>
            <p className="lp-hero-desc">
              Streamline operations from admissions to exams — built for administrators, teachers, and parents.
            </p>
          </div>

          {/* Feature list */}
          <ul className="lp-features">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="lp-feature">
                <span className="lp-feature-dot"><Icon size={13} /></span>
                {text}
              </li>
            ))}
          </ul>

          {/* Bottom badge */}
          <div className="lp-left-footer">
            <div className="lp-stat"><span className="lp-stat-num">2k+</span>Students</div>
            <div className="lp-stat-divider" />
            <div className="lp-stat"><span className="lp-stat-num">98%</span>Uptime</div>
            <div className="lp-stat-divider" />
            <div className="lp-stat"><span className="lp-stat-num">50+</span>Modules</div>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="lp-right">
        <div className="lp-form-wrap">
          {/* Header */}
          <div className="lp-form-head">
            <h2 className="lp-form-title">Welcome back</h2>
            <p className="lp-form-sub">Sign in to your {SCHOOL_INFO.name.split(' ')[0]} account</p>
          </div>

          {/* Role tabs */}
          <div className="lp-roles" role="group" aria-label="Select role">
            {roleOptions.map(r => (
              <button
                key={r.value}
                type="button"
                className={`lp-role${formData.role === r.value ? ' lp-role-active' : ''}`}
                onClick={() => setFormData(p => ({ ...p, role: r.value }))}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="lp-field">
              <label className="lp-label">Email address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`lp-input${errors.email ? ' lp-input-err' : ''}`}
                placeholder="name@school.edu"
                autoComplete="email"
                autoFocus
              />
              {errors.email && <p className="lp-err">{errors.email}</p>}
            </div>

            <div className="lp-field">
              <div className="lp-label-row">
                <label className="lp-label">Password</label>
                <Link to="/forgot-password" className="lp-forgot">Forgot?</Link>
              </div>
              <div className="lp-pw-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`lp-input${errors.password ? ' lp-input-err' : ''}`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button type="button" className="lp-eye" onClick={() => setShowPw(v => !v)} aria-label="Toggle">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="lp-err">{errors.password}</p>}
            </div>

            <button type="submit" className="lp-btn" disabled={loading}>
              {loading
                ? <span className="lp-spinner" />
                : <><span>Sign in</span><ArrowRight size={15} /></>
              }
            </button>
          </form>

          <p className="lp-footer-note">
            © {new Date().getFullYear()} {SCHOOL_INFO.name}
          </p>
        </div>
      </div>

      <style>{`
        /* ─── root ─── */
        .lp-root {
          display: flex;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        /* ─── LEFT PANEL ─── */
        .lp-left {
          position: relative;
          width: 46%;
          min-height: 100vh;
          background: #0f172a;
          display: flex;
          align-items: stretch;
          overflow: hidden;
          flex-shrink: 0;
        }

        /* Subtle grid lines */
        .lp-left::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
          z-index: 0;
        }

        /* Noise texture */
        .lp-noise {
          position: absolute;
          inset: 0;
          opacity: 0.04;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-size: 200px;
          z-index: 0;
        }

        /* Glowing orbs */
        .lp-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          z-index: 0;
        }
        .lp-orb-1 {
          width: 380px; height: 380px;
          background: radial-gradient(circle, rgba(99,102,241,0.28), transparent 70%);
          top: -60px; left: -80px;
        }
        .lp-orb-2 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(16,185,129,0.18), transparent 70%);
          bottom: 80px; right: -60px;
        }
        .lp-orb-3 {
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(245,158,11,0.14), transparent 70%);
          top: 50%; left: 55%;
          transform: translate(-50%,-50%);
        }

        .lp-left-inner {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          padding: 2.75rem 3rem;
          width: 100%;
        }

        /* Brand */
        .lp-brand {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          margin-bottom: auto;
        }
        .lp-brand-icon {
          width: 38px; height: 38px;
          background: linear-gradient(135deg, #6366f1, #818cf8);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          box-shadow: 0 4px 14px rgba(99,102,241,0.45);
        }
        .lp-brand-name {
          font-size: 1.125rem;
          font-weight: 700;
          color: #f1f5f9;
          letter-spacing: -0.3px;
        }

        /* Hero */
        .lp-hero {
          margin-top: 4rem;
          margin-bottom: 2.5rem;
        }
        .lp-hero-eyebrow {
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #6366f1;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .lp-hero-eyebrow::before {
          content: '';
          display: inline-block;
          width: 20px; height: 2px;
          background: #6366f1;
          border-radius: 2px;
        }
        .lp-hero-title {
          font-size: 2.5rem;
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.04em;
          color: #f8fafc;
          margin-bottom: 1rem;
        }
        .lp-hero-title em {
          font-style: normal;
          background: linear-gradient(135deg, #818cf8 0%, #34d399 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .lp-hero-desc {
          font-size: 0.9375rem;
          color: #94a3b8;
          line-height: 1.65;
          max-width: 320px;
        }

        /* Features */
        .lp-features {
          list-style: none;
          padding: 0; margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
          margin-bottom: 3.5rem;
        }
        .lp-feature {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          font-size: 0.875rem;
          color: #cbd5e1;
          font-weight: 400;
        }
        .lp-feature-dot {
          width: 26px; height: 26px;
          border-radius: 7px;
          background: rgba(99,102,241,0.18);
          border: 1px solid rgba(99,102,241,0.25);
          display: flex; align-items: center; justify-content: center;
          color: #818cf8;
          flex-shrink: 0;
        }

        /* Footer stats */
        .lp-left-footer {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.07);
        }
        .lp-stat {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 500;
        }
        .lp-stat-num {
          font-size: 1.125rem;
          font-weight: 700;
          color: #e2e8f0;
          letter-spacing: -0.02em;
          display: block;
        }
        .lp-stat-divider {
          width: 1px; height: 32px;
          background: rgba(255,255,255,0.08);
        }

        /* ─── RIGHT PANEL ─── */
        .lp-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          padding: 2rem;
        }

        .lp-form-wrap {
          width: 100%;
          max-width: 400px;
          animation: lp-rise 0.5s cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes lp-rise {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Form header */
        .lp-form-head { margin-bottom: 2rem; }
        .lp-form-title {
          font-size: 1.75rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: #0f172a;
          margin-bottom: 0.375rem;
        }
        .lp-form-sub {
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 400;
        }

        /* Role switcher */
        .lp-roles {
          display: flex;
          gap: 0.375rem;
          background: #f1f5f9;
          border-radius: 10px;
          padding: 0.25rem;
          margin-bottom: 1.75rem;
        }
        .lp-role {
          flex: 1;
          padding: 0.4rem 0.25rem;
          font-size: 0.775rem;
          font-weight: 500;
          font-family: inherit;
          border-radius: 7px;
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          transition: all 0.14s;
          white-space: nowrap;
        }
        .lp-role:hover:not(.lp-role-active) { color: #334155; }
        .lp-role-active {
          background: #fff;
          color: #1e293b;
          font-weight: 700;
          box-shadow: 0 1px 4px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04);
        }

        /* Fields */
        .lp-field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          margin-bottom: 1.125rem;
        }
        .lp-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .lp-label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #1e293b;
          letter-spacing: -0.01em;
        }
        .lp-forgot {
          font-size: 0.75rem;
          font-weight: 600;
          color: #6366f1;
          text-decoration: none;
          transition: color 0.14s;
        }
        .lp-forgot:hover { color: #4f46e5; text-decoration: underline; }

        .lp-input {
          width: 100%;
          height: 44px;
          padding: 0 1rem;
          font-size: 0.875rem;
          font-family: inherit;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          background: #f8fafc;
          color: #0f172a;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
          box-sizing: border-box;
        }
        .lp-input::placeholder { color: #94a3b8; }
        .lp-input:focus {
          border-color: #6366f1;
          background: #fff;
          box-shadow: 0 0 0 3.5px rgba(99,102,241,0.13);
        }
        .lp-input-err {
          border-color: #f43f5e !important;
          box-shadow: 0 0 0 3px rgba(244,63,94,0.10) !important;
        }
        .lp-err {
          font-size: 0.75rem;
          color: #f43f5e;
          margin-top: 0.125rem;
          font-weight: 500;
        }

        .lp-pw-wrap { position: relative; }
        .lp-pw-wrap .lp-input { padding-right: 2.75rem; }
        .lp-eye {
          position: absolute;
          right: 0.875rem; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          color: #94a3b8; cursor: pointer;
          display: flex; align-items: center;
          padding: 0.2rem;
          transition: color 0.14s;
        }
        .lp-eye:hover { color: #6366f1; }

        /* Submit */
        .lp-btn {
          width: 100%; height: 46px;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          margin-top: 0.5rem;
          background: #0f172a;
          color: #fff;
          font-size: 0.9rem;
          font-weight: 700;
          font-family: inherit;
          letter-spacing: -0.01em;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 1px 2px rgba(0,0,0,0.2), 0 4px 12px rgba(15,23,42,0.20);
        }
        .lp-btn:hover:not(:disabled) {
          background: #1e293b;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.15), 0 8px 20px rgba(15,23,42,0.25);
        }
        .lp-btn:active:not(:disabled) { transform: translateY(0); }
        .lp-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .lp-spinner {
          width: 18px; height: 18px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: lp-spin 0.65s linear infinite;
        }
        @keyframes lp-spin { to { transform: rotate(360deg); } }

        /* Footer note */
        .lp-footer-note {
          font-size: 0.7125rem;
          color: #94a3b8;
          text-align: center;
          margin-top: 2rem;
          line-height: 1.5;
        }

        /* ─── Responsive ─── */
        @media (max-width: 900px) {
          .lp-left { display: none; }
          .lp-right { background: #f8fafc; }
          .lp-form-wrap {
            background: #fff;
            border-radius: 20px;
            padding: 2.25rem 2rem;
            box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 8px 30px rgba(0,0,0,0.08);
          }
        }
        @media (max-width: 480px) {
          .lp-right { padding: 1.25rem; }
          .lp-form-wrap { padding: 1.75rem 1.5rem; border-radius: 16px; }
          .lp-form-title { font-size: 1.5rem; }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
