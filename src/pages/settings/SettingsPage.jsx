import React, { useState } from 'react';
import { Save, School, Calendar, Users, Bell, Lock, Database } from 'lucide-react';
import { SCHOOL_INFO } from '../../constants';
import Breadcrumb from '../../components/common/Breadcrumb';
import toast from 'react-hot-toast';

const SettingsPage = () => {
    const [activeTab, setActiveTab] = useState('school');
    const [schoolSettings, setSchoolSettings] = useState(SCHOOL_INFO);

    const breadcrumbItems = [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Settings', path: null },
    ];

    const handleSave = () => {
        toast.success('Settings saved successfully');
    };

    const tabs = [
        { id: 'school', label: 'School Info', icon: School },
        { id: 'academic', label: 'Academic Year', icon: Calendar },
        { id: 'users', label: 'User Management', icon: Users },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Lock },
        { id: 'backup', label: 'Backup & Restore', icon: Database },
    ];

    return (
        <div className="settings-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="page-header">
                <div>
                    <h1>Settings</h1>
                    <p className="text-gray-600">Configure system settings and preferences</p>
                </div>
            </div>

            <div className="settings-container">
                {/* Sidebar Tabs */}
                <div className="settings-sidebar">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <Icon size={18} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Content Area */}
                <div className="settings-content">
                    {activeTab === 'school' && (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">School Information</h3>
                            </div>
                            <form className="settings-form">
                                <div className="form-group">
                                    <label className="form-label">School Name *</label>
                                    <input
                                        type="text"
                                        value={schoolSettings.name}
                                        onChange={(e) => setSchoolSettings({ ...schoolSettings, name: e.target.value })}
                                        className="input"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Tagline</label>
                                    <input
                                        type="text"
                                        value={schoolSettings.tagline}
                                        onChange={(e) => setSchoolSettings({ ...schoolSettings, tagline: e.target.value })}
                                        className="input"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Address *</label>
                                    <textarea
                                        value={schoolSettings.address}
                                        onChange={(e) => setSchoolSettings({ ...schoolSettings, address: e.target.value })}
                                        className="textarea"
                                        rows="3"
                                    />
                                </div>

                                <div className="grid grid-cols-2">
                                    <div className="form-group">
                                        <label className="form-label">Phone *</label>
                                        <input
                                            type="tel"
                                            value={schoolSettings.phone}
                                            onChange={(e) => setSchoolSettings({ ...schoolSettings, phone: e.target.value })}
                                            className="input"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Email *</label>
                                        <input
                                            type="email"
                                            value={schoolSettings.email}
                                            onChange={(e) => setSchoolSettings({ ...schoolSettings, email: e.target.value })}
                                            className="input"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Website</label>
                                    <input
                                        type="url"
                                        value={schoolSettings.website}
                                        onChange={(e) => setSchoolSettings({ ...schoolSettings, website: e.target.value })}
                                        className="input"
                                    />
                                </div>

                                <button type="button" className="btn btn-primary" onClick={handleSave}>
                                    <Save size={18} />
                                    <span>Save Changes</span>
                                </button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'academic' && (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">Academic Year Settings</h3>
                            </div>
                            <form className="settings-form">
                                <div className="grid grid-cols-2">
                                    <div className="form-group">
                                        <label className="form-label">Current Academic Year *</label>
                                        <input type="text" className="input" defaultValue="2024-2025" />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Session Start Date *</label>
                                        <input type="date" className="input" defaultValue="2024-04-01" />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Session End Date *</label>
                                        <input type="date" className="input" defaultValue="2025-03-31" />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Total Working Days</label>
                                        <input type="number" className="input" defaultValue="220" />
                                    </div>
                                </div>

                                <button type="button" className="btn btn-primary" onClick={handleSave}>
                                    <Save size={18} />
                                    <span>Save Changes</span>
                                </button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">User Management Settings</h3>
                            </div>
                            <div className="settings-form">
                                <div className="setting-item">
                                    <div>
                                        <h4 className="setting-title">Allow Self Registration</h4>
                                        <p className="setting-description">Allow users to register themselves</p>
                                    </div>
                                    <label className="toggle">
                                        <input type="checkbox" />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="setting-item">
                                    <div>
                                        <h4 className="setting-title">Email Verification Required</h4>
                                        <p className="setting-description">Require email verification for new accounts</p>
                                    </div>
                                    <label className="toggle">
                                        <input type="checkbox" defaultChecked />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="setting-item">
                                    <div>
                                        <h4 className="setting-title">Two-Factor Authentication</h4>
                                        <p className="setting-description">Enable 2FA for enhanced security</p>
                                    </div>
                                    <label className="toggle">
                                        <input type="checkbox" />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <button type="button" className="btn btn-primary" onClick={handleSave}>
                                    <Save size={18} />
                                    <span>Save Changes</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">Notification Settings</h3>
                            </div>
                            <div className="settings-form">
                                <div className="setting-item">
                                    <div>
                                        <h4 className="setting-title">Email Notifications</h4>
                                        <p className="setting-description">Send email notifications for important events</p>
                                    </div>
                                    <label className="toggle">
                                        <input type="checkbox" defaultChecked />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="setting-item">
                                    <div>
                                        <h4 className="setting-title">SMS Notifications</h4>
                                        <p className="setting-description">Send SMS for urgent notifications</p>
                                    </div>
                                    <label className="toggle">
                                        <input type="checkbox" />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="setting-item">
                                    <div>
                                        <h4 className="setting-title">Push Notifications</h4>
                                        <p className="setting-description">Browser push notifications</p>
                                    </div>
                                    <label className="toggle">
                                        <input type="checkbox" defaultChecked />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <button type="button" className="btn btn-primary" onClick={handleSave}>
                                    <Save size={18} />
                                    <span>Save Changes</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">Security Settings</h3>
                            </div>
                            <form className="settings-form">
                                <div className="form-group">
                                    <label className="form-label">Password Minimum Length</label>
                                    <input type="number" className="input" defaultValue="8" min="6" max="20" />
                                </div>

                                <div className="setting-item">
                                    <div>
                                        <h4 className="setting-title">Require Special Characters</h4>
                                        <p className="setting-description">Passwords must contain special characters</p>
                                    </div>
                                    <label className="toggle">
                                        <input type="checkbox" defaultChecked />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Session Timeout (minutes)</label>
                                    <input type="number" className="input" defaultValue="30" />
                                </div>

                                <button type="button" className="btn btn-primary" onClick={handleSave}>
                                    <Save size={18} />
                                    <span>Save Changes</span>
                                </button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'backup' && (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">Backup & Restore</h3>
                            </div>
                            <div className="settings-form">
                                <div className="backup-section">
                                    <h4 className="section-title">Database Backup</h4>
                                    <p className="section-description">Create a backup of your database</p>
                                    <button className="btn btn-primary">
                                        <Database size={18} />
                                        <span>Create Backup</span>
                                    </button>
                                </div>

                                <div className="backup-section">
                                    <h4 className="section-title">Restore Database</h4>
                                    <p className="section-description">Restore from a previous backup</p>
                                    <input type="file" className="input" accept=".sql,.zip" />
                                    <button className="btn btn-outline">
                                        <Database size={18} />
                                        <span>Restore Backup</span>
                                    </button>
                                </div>

                                <div className="setting-item">
                                    <div>
                                        <h4 className="setting-title">Automatic Backups</h4>
                                        <p className="setting-description">Schedule automatic daily backups</p>
                                    </div>
                                    <label className="toggle">
                                        <input type="checkbox" defaultChecked />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
        .settings-page {
          animation: fadeIn 0.3s ease-in-out;
        }

        .page-header {
          margin-bottom: var(--spacing-xl);
        }

        .page-header h1 {
          font-size: 2rem;
          font-weight: 700;
          color: var(--gray-900);
          margin-bottom: var(--spacing-xs);
        }

        .settings-container {
          display: grid;
          grid-template-columns: 250px 1fr;
          gap: var(--spacing-xl);
        }

        .settings-sidebar {
          background: white;
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
          color: var(--gray-700);
          text-align: left;
        }

        .tab-button:hover {
          background: var(--gray-50);
        }

        .tab-button.active {
          background: var(--primary-50);
          color: var(--primary-700);
          font-weight: 600;
        }

        .settings-content {
          min-height: 500px;
        }

        .settings-form {
          padding: var(--spacing-xl);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-lg);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-md);
        }

        .setting-title {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--gray-900);
          margin-bottom: 0.25rem;
        }

        .setting-description {
          font-size: 0.8125rem;
          color: var(--gray-600);
          margin: 0;
        }

        .toggle {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 24px;
        }

        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--gray-300);
          transition: 0.3s;
          border-radius: 24px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }

        .toggle input:checked + .toggle-slider {
          background-color: var(--primary-500);
        }

        .toggle input:checked + .toggle-slider:before {
          transform: translateX(24px);
        }

        .backup-section {
          padding: var(--spacing-lg);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-md);
        }

        .section-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--gray-900);
          margin-bottom: 0.5rem;
        }

        .section-description {
          font-size: 0.875rem;
          color: var(--gray-600);
          margin-bottom: var(--spacing-md);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
        </div>
    );
};

export default SettingsPage;
