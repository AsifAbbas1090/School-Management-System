import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Users, MapPin, Plus, TrendingUp, Settings, School, ShieldAlert } from 'lucide-react';
import { useSchoolStore, useAuthStore } from '../../store';
import { analyticsService, schoolsService } from '../../services/api';
import { USER_ROLES } from '../../constants';
import { formatDate } from '../../utils';
import toast from 'react-hot-toast';



const SuperAdminDashboard = () => {
    const { user } = useAuthStore();
    const { schools, setSchools, setCurrentSchool } = useSchoolStore();
    const navigate = useNavigate();

    const isAuthorized = user?.role === USER_ROLES.SUPER_ADMIN;

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center min-vh-50 text-center p-xl">
                <ShieldAlert size={64} className="text-error mb-md" />
                <h1 className="text-2xl font-bold mb-sm">Access Denied</h1>
                <p className="text-gray-600 max-w-md">
                    You do not have permission to view the super admin dashboard.
                </p>
                <button
                    className="btn btn-primary mt-lg"
                    onClick={() => navigate(-1)}
                >
                    Go Back
                </button>
            </div>
        );
    }

    const [stats, setStats] = useState({
        totalSchools: 0,
        totalStudents: 0,
        totalRevenue: 0,
        activeCampuses: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            // Load super admin analytics
            const analyticsResponse = await analyticsService.getSuperAdminStats();
            if (analyticsResponse.success && analyticsResponse.data) {
                setStats(analyticsResponse.data);
            }

            // Load schools
            const schoolsResponse = await schoolsService.getAll();
            if (schoolsResponse.success && schoolsResponse.data) {
                const schoolsData = schoolsResponse.data.data || schoolsResponse.data;
                // Update store if needed
                setSchools(schoolsData);
            }
        } catch (error) {
            // Silently handle errors - UI shows empty state
        } finally {
            setLoading(false);
        }
    };

    const handleEnterSchool = (school) => {
        setCurrentSchool(school);
        toast.success(`Switched context to ${school.name}`);
        // In a real app, this might redirect to that school's specific dashboard URL
    };

    return (
        <div className="super-admin-dashboard">
            <div className="page-header" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <div>
                    <h1 className="page-title">Super Admin Dashboard</h1>
                    <p className="page-subtitle">Overview of all schools and global performance</p>
                </div>
                <div className="flex gap-md">
                    <button className="btn btn-primary" onClick={() => navigate('/schools')}>
                        <Plus size={18} />
                        <span>Manage Schools</span>
                    </button>
                    <button className="btn btn-outline">
                        <Settings size={18} />
                        <span>Global Settings</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-md mb-xl">
                {[
                    { icon: School, label: 'Total Schools', value: stats.totalSchools, color: 'primary' },
                    { icon: Users, label: 'Total Students', value: stats.totalStudents?.toLocaleString(), color: 'success' },
                    { icon: TrendingUp, label: 'Total Revenue', value: `$ ${stats.totalRevenue?.toLocaleString()}`, color: 'warning' },
                    { icon: MapPin, label: 'Active Campuses', value: stats.activeCampuses, color: 'secondary' },
                ].map((card, i) => {
                    const Icon = card.icon;
                    return (
                        <div key={i} className="kpi-card">
                            <div className="kpi-header">
                                <div className={`kpi-icon kpi-icon-${card.color}`}><Icon size={22} /></div>
                            </div>
                            <div className="kpi-body">
                                <h3 className="kpi-value">{card.value}</h3>
                                <p className="kpi-title">{card.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Schools List */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Managed Schools & Subscriptions</h3>
                    <input type="text" placeholder="Search schools..." className="input" style={{ width: '220px', height: '36px' }} />
                </div>
                <div style={{ padding: 'var(--spacing-lg)' }}>
                    <div className="grid grid-cols-3 gap-md">
                        {schools.map(school => (
                            <div key={school.id} className="school-entry-card">
                                <div className="flex justify-between items-start mb-md">
                                    <div className="school-entry-icon">
                                        {school.logo ? (
                                            <img src={school.logo} alt={school.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <Building size={20} style={{ color: 'var(--gray-400)' }} />
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-xs">
                                        <span className={`badge badge-${school.status === 'active' ? 'success' : 'error'}`}>
                                            {school.status}
                                        </span>
                                        <span className={`badge badge-${school.subscriptionPlan === 'enterprise' ? 'purple' : school.subscriptionPlan === 'premium' ? 'warning' : 'gray'}`}>
                                            {school.subscriptionPlan?.toUpperCase() || 'FREE'}
                                        </span>
                                    </div>
                                </div>

                                <h4 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{school.name}</h4>
                                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{school.address || 'No address provided'}</p>

                                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div className="flex justify-between" style={{ fontSize: '0.75rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Subscription:</span>
                                        <span style={{ color: school.subscriptionStatus === 'active' ? 'var(--success-600)' : 'var(--error-600)', fontWeight: 600 }}>
                                            {school.subscriptionStatus?.toUpperCase() || 'ACTIVE'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between" style={{ fontSize: '0.75rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Next Payment:</span>
                                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                            {school.nextPaymentDate ? formatDate(new Date(school.nextPaymentDate)) : 'N/A'}
                                        </span>
                                    </div>
                                    <button
                                        className="btn btn-sm btn-primary"
                                        style={{ width: '100%', marginTop: '0.5rem' }}
                                        onClick={() => handleEnterSchool(school)}
                                    >
                                        Manage Dashboard
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>


            <style>{`
                .super-admin-dashboard { animation: fadeIn 0.3s ease-in-out; }
                .school-entry-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: var(--spacing-md);
                    display: flex;
                    flex-direction: column;
                    transition: box-shadow var(--transition-base), transform var(--transition-base);
                }
                .school-entry-card:hover {
                    box-shadow: var(--shadow-md);
                    transform: translateY(-2px);
                }
                .school-entry-icon {
                    width: 48px;
                    height: 48px;
                    background: var(--gray-100);
                    border-radius: var(--radius-md);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    flex-shrink: 0;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default SuperAdminDashboard;
