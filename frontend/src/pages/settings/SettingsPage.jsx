import React, { useState, useEffect, useCallback } from 'react';
import { Save, School, Bell, Lock, ShieldAlert, Info } from 'lucide-react';
import { USER_ROLES } from '../../constants';
import { useAuthStore, useSchoolStore } from '../../store';
import { schoolsService } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import toast from 'react-hot-toast';

const emptySchoolForm = () => ({
  name: '',
  principalName: '',
  ownerName: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  logoUrl: '',
});

function mapSchoolToForm(s) {
  if (!s) return emptySchoolForm();
  return {
    name: s.name ?? '',
    principalName: s.principalName ?? '',
    ownerName: s.ownerName ?? '',
    address: s.address ?? '',
    phone: s.phone ?? '',
    email: s.email ?? '',
    website: s.website ?? '',
    logoUrl: s.logoUrl ?? s.logo ?? '',
  };
}

function formToPayload(form) {
  return {
    name: form.name?.trim() || undefined,
    principalName: form.principalName?.trim() || undefined,
    ownerName: form.ownerName?.trim() || undefined,
    address: form.address?.trim() || undefined,
    phone: form.phone?.trim() || undefined,
    email: form.email?.trim() || undefined,
    website: form.website?.trim() || undefined,
    logoUrl: form.logoUrl?.trim() || undefined,
  };
}

const ComingSoonPanel = ({ title, description }) => (
  <div className="card" style={{ opacity: 0.85 }}>
    <div className="card-header">
      <h3 className="card-title">{title}</h3>
    </div>
    <div className="settings-form">
      <div
        className="p-lg rounded-lg border border-dashed border-gray-300 bg-gray-50 text-center"
        style={{ pointerEvents: 'none' }}
      >
        <Info className="mx-auto mb-md text-gray-400" size={40} />
        <p className="font-semibold text-gray-700">Coming soon</p>
        <p className="text-sm text-gray-500 mt-sm max-w-md mx-auto">{description}</p>
        <p className="text-xs text-gray-400 mt-md">No backend API is available for this section yet.</p>
      </div>
    </div>
  </div>
);

const SettingsPage = () => {
  const { user } = useAuthStore();
  const { currentSchool, setCurrentSchool } = useSchoolStore();
  const [activeTab, setActiveTab] = useState('school');
  const [schoolForm, setSchoolForm] = useState(emptySchoolForm);
  const [loadingSchool, setLoadingSchool] = useState(true);
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = user?.role === USER_ROLES.SUPER_ADMIN;
  const isAuthorized = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGEMENT].includes(user?.role);

  const loadSchool = useCallback(async () => {
    setLoadingSchool(true);
    try {
      if (isSuperAdmin) {
        const id = currentSchool?.id;
        if (!id) {
          setSchoolForm(emptySchoolForm());
          return;
        }
        const res = await schoolsService.getById(id);
        if (res.success && res.data) {
          setSchoolForm(mapSchoolToForm(res.data));
        } else {
          toast.error(res.error || 'Could not load school');
          setSchoolForm(emptySchoolForm());
        }
        return;
      }
      const res = await schoolsService.getMySchoolProfile();
      if (res.success && res.data) {
        setSchoolForm(mapSchoolToForm(res.data));
        setCurrentSchool(res.data);
      } else {
        toast.error(res.error || 'Could not load school profile');
        setSchoolForm(emptySchoolForm());
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load school');
      setSchoolForm(emptySchoolForm());
    } finally {
      setLoadingSchool(false);
    }
  }, [isSuperAdmin, currentSchool?.id, setCurrentSchool]);

  useEffect(() => {
    if (!isAuthorized) return;
    loadSchool();
  }, [isAuthorized, loadSchool]);

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-vh-50 text-center p-xl">
        <ShieldAlert size={64} className="text-error mb-md" />
        <h1 className="page-title">Access Denied</h1>
        <p className="text-gray-600 max-w-md">
          You do not have permission to view or modify system settings.
        </p>
        <button className="btn btn-primary mt-lg" type="button" onClick={() => window.history.back()}>
          Go Back
        </button>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Settings', path: null },
  ];

  const handleSaveSchool = async () => {
    const payload = formToPayload(schoolForm);
    if (!payload.name) {
      toast.error('School name is required');
      return;
    }

    setSaving(true);
    try {
      let res;
      if (isSuperAdmin) {
        const id = currentSchool?.id;
        if (!id) {
          toast.error('Select a school first (e.g. set current school from the Schools page or header).');
          setSaving(false);
          return;
        }
        res = await schoolsService.update(id, payload);
      } else {
        res = await schoolsService.updateMySchoolProfile(payload);
      }

      if (res.success && res.data) {
        toast.success('School information saved');
        setSchoolForm(mapSchoolToForm(res.data));
        if (!isSuperAdmin || (isSuperAdmin && currentSchool?.id === res.data.id)) {
          setCurrentSchool(res.data);
        }
      } else {
        toast.error(res?.error || 'Failed to save');
      }
    } catch (e) {
      console.error(e);
      toast.error('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'school', label: 'School info', icon: School },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
  ];

  return (
    <div className="settings-page">
      <Breadcrumb items={breadcrumbItems} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="text-gray-600">School profile and preferences</p>
        </div>
      </div>

      {isSuperAdmin && !currentSchool?.id && (
        <div className="mb-lg p-md rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          Select a school (from the Schools list or your session) before editing. Super admins use{' '}
          <strong>PATCH /super-admin/schools/:id</strong>.
        </div>
      )}

      <div className="settings-container">
        <div className="settings-sidebar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="settings-content">
          {activeTab === 'school' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">School information</h3>
                <p className="text-sm text-gray-500 mt-xs">
                  {isSuperAdmin
                    ? 'Updates this school via super-admin API.'
                    : 'Updates your school via PATCH /school/profile.'}
                </p>
              </div>
              {loadingSchool ? (
                <div className="settings-form text-gray-500">Loading…</div>
              ) : (
                <form
                  className="settings-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveSchool();
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">School name *</label>
                    <input
                      type="text"
                      value={schoolForm.name}
                      onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                      className="input"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-md">
                    <div className="form-group">
                      <label className="form-label">Principal</label>
                      <input
                        type="text"
                        value={schoolForm.principalName}
                        onChange={(e) => setSchoolForm({ ...schoolForm, principalName: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Owner</label>
                      <input
                        type="text"
                        value={schoolForm.ownerName}
                        onChange={(e) => setSchoolForm({ ...schoolForm, ownerName: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Address</label>
                    <textarea
                      value={schoolForm.address}
                      onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                      className="textarea"
                      rows="3"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-md">
                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input
                        type="tel"
                        value={schoolForm.phone}
                        onChange={(e) => setSchoolForm({ ...schoolForm, phone: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        value={schoolForm.email}
                        onChange={(e) => setSchoolForm({ ...schoolForm, email: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Website</label>
                    <input
                      type="text"
                      value={schoolForm.website}
                      onChange={(e) => setSchoolForm({ ...schoolForm, website: e.target.value })}
                      className="input"
                      placeholder="https://…"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Logo URL</label>
                    <input
                      type="text"
                      value={schoolForm.logoUrl}
                      onChange={(e) => setSchoolForm({ ...schoolForm, logoUrl: e.target.value })}
                      className="input"
                      placeholder="https://…"
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" disabled={saving || (isSuperAdmin && !currentSchool?.id)}>
                    <Save size={18} />
                    <span>{saving ? 'Saving…' : 'Save changes'}</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <ComingSoonPanel
              title="Notifications"
              description="Email, SMS, and push preferences will be configurable here once notification settings are implemented in the API."
            />
          )}

          {activeTab === 'security' && (
            <ComingSoonPanel
              title="Security"
              description="Password policies and session controls will appear here when a security settings API exists."
            />
          )}
        </div>
      </div>

      <style>{`
        .settings-page { animation: fadeIn 0.3s ease-in-out; }
        .page-header { margin-bottom: var(--spacing-xl); }
        .page-header h1 {
          font-size: 2rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: var(--spacing-xs);
        }
        .settings-container {
          display: grid;
          grid-template-columns: 250px 1fr;
          gap: var(--spacing-xl);
        }
        .settings-sidebar {
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
          box-shadow: var(--shadow-sm);
          height: fit-content;
        }
        .tab-button {
          width: 100%;
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          border: none;
          background: none;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-base);
          font-size: 0.875rem;
          color: var(--text-primary);
          text-align: left;
        }
        .tab-button:hover { background: var(--gray-50); }
        .tab-button.active {
          background: var(--primary-50);
          color: var(--primary-700);
          font-weight: 600;
        }
        .settings-content { min-height: 400px; }
        .settings-form {
          padding: var(--spacing-xl);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default SettingsPage;
