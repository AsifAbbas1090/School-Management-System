import React, { useState, useEffect } from 'react';
import { Plus, Building, DollarSign, Users, UserCheck, Calendar, AlertCircle, CheckCircle, Clock, Upload, Trash2, Edit, ShieldAlert, TrendingUp } from 'lucide-react';
import { useSchoolStore, useAuthStore, useStudentsStore, useTeachersStore, useParentsStore, useClassesStore } from '../../store';
import { SUBSCRIPTION_STATUS, USER_ROLES } from '../../constants';
import { generateId, formatCurrency, formatDate } from '../../utils';
import { generateSchoolData, generateSchoolSlug } from '../../utils/schoolDataGenerator';
import toast from 'react-hot-toast';

const SchoolsPage = () => {
    const { user } = useAuthStore();
    const {
        schools,
        addSchool,
        updateSchool,
        deleteSchool,
        getTotalMonthlyRevenue,
        getTotalRevenue,
        getDueSchools,
        getSchoolStats
    } = useSchoolStore();
    
    const { addStudent, setStudents } = useStudentsStore();
    const { addTeacher, setTeachers } = useTeachersStore();
    const { addParent, setParents } = useParentsStore();
    const { addClass, addSection, addSubject, setClasses, setSections, setSubjects } = useClassesStore();

    const isAuthorized = user?.role === USER_ROLES.SUPER_ADMIN;

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center min-vh-50 text-center p-xl">
                <ShieldAlert size={64} className="text-error mb-md" />
                <h1 className="text-2xl font-bold mb-sm">Access Denied</h1>
                <p className="text-gray-600 max-w-md">
                    You do not have permission to manage schools and subscriptions.
                </p>
                <button
                    className="btn btn-primary mt-lg"
                    onClick={() => window.history.back()}
                >
                    Go Back
                </button>
            </div>
        );
    }
    const [showModal, setShowModal] = useState(false);
    const [editingSchool, setEditingSchool] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        email: '',
        principalName: '',
        ownerName: '',
        subscriptionAmount: '',
        subscriptionStartDate: new Date().toISOString().split('T')[0],
        adminEmail: '',
        adminPassword: '',
        logo: null,
        logoFile: null,
    });

    const [logoPreview, setLogoPreview] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast.error('Please upload an image file');
                return;
            }
            
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Logo file size should be less than 5MB');
                return;
            }
            
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result);
                setFormData(prev => ({ 
                    ...prev, 
                    logo: reader.result, // Base64 for display
                    logoFile: file, // Actual file for storage
                    logoFileName: file.name 
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.subscriptionAmount || !formData.adminEmail || !formData.adminPassword || !formData.principalName || !formData.ownerName) {
            toast.error('Please fill in all required fields');
            return;
        }

        const schoolId = editingSchool ? editingSchool.id : generateId();
        const schoolSlug = generateSchoolSlug(formData.name);
        
        // Store logo file in localStorage (in production, upload to server)
        let logoUrl = formData.logo;
        if (formData.logoFile && !editingSchool) {
            // Store file reference
            const logoKey = `school_logo_${schoolId}`;
            localStorage.setItem(logoKey, formData.logo);
            localStorage.setItem(`${logoKey}_filename`, formData.logoFileName || 'logo.png');
            logoUrl = formData.logo; // Base64 data URL
        } else if (editingSchool && formData.logoFile) {
            const logoKey = `school_logo_${schoolId}`;
            localStorage.setItem(logoKey, formData.logo);
            localStorage.setItem(`${logoKey}_filename`, formData.logoFileName || 'logo.png');
            logoUrl = formData.logo;
        } else if (editingSchool) {
            logoUrl = editingSchool.logo || formData.logo;
        }

        const schoolData = {
            ...formData,
            id: schoolId,
            slug: schoolSlug,
            subscriptionAmount: parseFloat(formData.subscriptionAmount),
            subscriptionStartDate: new Date(formData.subscriptionStartDate),
            subscriptionStatus: SUBSCRIPTION_STATUS.ACTIVE,
            nextBillingDate: new Date(new Date(formData.subscriptionStartDate).setMonth(new Date(formData.subscriptionStartDate).getMonth() + 1)),
            logo: logoUrl,
            loginUrl: `/${schoolSlug}/signin`,
            createdAt: editingSchool ? editingSchool.createdAt : new Date(),
            updatedAt: new Date(),
        };

        // Create admin user for first login
        if (!editingSchool && formData.adminEmail && formData.adminPassword) {
            const adminUser = {
                id: generateId(),
                name: formData.ownerName || 'School Admin',
                email: formData.adminEmail,
                password: formData.adminPassword,
                role: USER_ROLES.ADMIN,
                schoolId: schoolId,
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            
            // Store admin user in localStorage
            const adminUsers = JSON.parse(localStorage.getItem('admin-users') || '[]');
            adminUsers.push(adminUser);
            localStorage.setItem('admin-users', JSON.stringify(adminUsers));
            
            // Also add to mockUsers for immediate login
            if (typeof mockData !== 'undefined' && mockData.users) {
                mockData.users.push(adminUser);
            }
        }

        if (editingSchool) {
            updateSchool(editingSchool.id, schoolData);
            toast.success('School updated successfully!');
        } else {
            // Add school
            addSchool(schoolData);
            
            // Generate comprehensive school data
            toast.loading('Generating school data...', { id: 'generating' });
            
            try {
                const schoolDataGenerated = generateSchoolData(schoolId, formData.name, formData.principalName);
                
                // Add all generated data to stores
                schoolDataGenerated.classes.forEach(cls => addClass(cls));
                schoolDataGenerated.sections.forEach(sec => addSection(sec));
                schoolDataGenerated.subjects.forEach(sub => addSubject(sub));
                schoolDataGenerated.teachers.forEach(teacher => addTeacher(teacher));
                schoolDataGenerated.students.forEach(student => addStudent(student));
                schoolDataGenerated.parents.forEach(parent => addParent(parent));
                
                // Store school-specific data in localStorage
                const schoolDataKey = `school_data_${schoolId}`;
                localStorage.setItem(schoolDataKey, JSON.stringify({
                    classes: schoolDataGenerated.classes,
                    sections: schoolDataGenerated.sections,
                    subjects: schoolDataGenerated.subjects,
                    teachers: schoolDataGenerated.teachers,
                    students: schoolDataGenerated.students,
                    parents: schoolDataGenerated.parents,
                }));
                
                toast.success(`School "${formData.name}" created successfully with ${schoolDataGenerated.students.length} students, ${schoolDataGenerated.teachers.length} teachers, and ${schoolDataGenerated.classes.length} classes!`, { id: 'generating' });
            } catch (error) {
                console.error('Error generating school data:', error);
                toast.error('School created but data generation failed', { id: 'generating' });
            }
        }

        resetForm();
    };

    const resetForm = () => {
        setFormData({
            name: '',
            address: '',
            phone: '',
            email: '',
            principalName: '',
            ownerName: '',
            subscriptionAmount: '',
            subscriptionStartDate: new Date().toISOString().split('T')[0],
            adminEmail: '',
            adminPassword: '',
            logo: null,
            logoFile: null,
        });
        setLogoPreview(null);
        setEditingSchool(null);
        setShowModal(false);
    };

    const handleEdit = (school) => {
        setEditingSchool(school);
        setFormData({
            name: school.name,
            address: school.address || '',
            phone: school.phone || '',
            email: school.email || '',
            principalName: school.principalName || '',
            ownerName: school.ownerName || '',
            subscriptionAmount: school.subscriptionAmount?.toString() || '',
            subscriptionStartDate: new Date(school.subscriptionStartDate).toISOString().split('T')[0],
            adminEmail: school.adminEmail,
            adminPassword: school.adminPassword,
            logo: school.logo,
            logoFile: null,
        });
        setLogoPreview(school.logo);
        setShowModal(true);
    };

    const handleDelete = (schoolId) => {
        if (window.confirm('Are you sure you want to delete this school? This action cannot be undone.')) {
            deleteSchool(schoolId);
            toast.success('School deleted successfully!');
        }
    };

    const getSubscriptionStatusBadge = (status) => {
        const badges = {
            [SUBSCRIPTION_STATUS.ACTIVE]: { color: 'green', icon: CheckCircle, label: 'Active' },
            [SUBSCRIPTION_STATUS.EXPIRED]: { color: 'red', icon: AlertCircle, label: 'Expired' },
            [SUBSCRIPTION_STATUS.DUE_SOON]: { color: 'orange', icon: Clock, label: 'Due Soon' },
            [SUBSCRIPTION_STATUS.PENDING]: { color: 'gray', icon: Clock, label: 'Pending' },
        };

        const badge = badges[status] || badges[SUBSCRIPTION_STATUS.PENDING];
        const Icon = badge.icon;

        return (
            <span className={`badge badge-${badge.color}`}>
                <Icon size={14} />
                {badge.label}
            </span>
        );
    };

    const monthlyRevenue = getTotalMonthlyRevenue();
    const totalRevenue = getTotalRevenue();
    const dueSchools = getDueSchools();

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Schools Management</h1>
                    <p className="page-subtitle">Manage schools, subscriptions, and revenue</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={20} />
                    Add School
                </button>
            </div>

            {/* Revenue Overview */}
            <div className="stats-grid">
                <div className="stat-card stat-primary">
                    <div className="stat-icon-wrapper">
                        <Building size={28} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Total Schools</p>
                        <p className="stat-value">{schools.length}</p>
                        <p className="stat-sublabel">Active institutions</p>
                    </div>
                </div>

                <div className="stat-card stat-success">
                    <div className="stat-icon-wrapper">
                        <DollarSign size={28} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Monthly Revenue</p>
                        <p className="stat-value">{formatCurrency(monthlyRevenue)}</p>
                        <p className="stat-sublabel">Recurring income</p>
                    </div>
                </div>

                <div className="stat-card stat-info">
                    <div className="stat-icon-wrapper">
                        <TrendingUp size={28} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Total Revenue</p>
                        <p className="stat-value">{formatCurrency(totalRevenue)}</p>
                        <p className="stat-sublabel">All-time earnings</p>
                    </div>
                </div>

                <div className="stat-card stat-warning">
                    <div className="stat-icon-wrapper">
                        <AlertCircle size={28} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Due/Expired</p>
                        <p className="stat-value">{dueSchools.length}</p>
                        <p className="stat-sublabel">Requires attention</p>
                    </div>
                </div>
            </div>

            {/* Due Subscriptions Alert */}
            {dueSchools.length > 0 && (
                <div className="alert alert-warning">
                    <AlertCircle size={20} />
                    <div>
                        <strong>{dueSchools.length} school(s)</strong> have due or expired subscriptions
                    </div>
                </div>
            )}

            {/* Schools Grid */}
            <div className="schools-grid">
                {schools.map((school) => (
                    <div key={school.id} className="school-card">
                        <div className="school-card-header">
                            {school.logo ? (
                                <img src={school.logo} alt={school.name} className="school-logo" />
                            ) : (
                                <div className="school-logo-placeholder">
                                    <Building size={32} />
                                </div>
                            )}
                            <div className="school-card-actions">
                                <button className="icon-btn" onClick={() => handleEdit(school)} title="Edit">
                                    <Edit size={18} />
                                </button>
                                <button className="icon-btn icon-btn-danger" onClick={() => handleDelete(school.id)} title="Delete">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="school-card-body">
                            <h3 className="school-name">{school.name}</h3>
                            <p className="school-address">{school.address || 'No address provided'}</p>

                            {/* Dynamic Stats from Store */}
                            {(() => {
                                const stats = getSchoolStats(school.id);
                                return (
                                    <div className="school-stats">
                                        <div className="school-stat" title="Total Students">
                                            <Users size={16} />
                                            <span>{stats.totalStudents} Students</span>
                                        </div>
                                        <div className="school-stat" title="Total Teachers">
                                            <UserCheck size={16} />
                                            <span>{stats.totalTeachers} Teachers</span>
                                        </div>
                                        <div className="school-stat" title="Management Staff">
                                            <UserCheck size={16} />
                                            <span>{stats.totalManagement} Management</span>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="school-subscription">
                                <div className="subscription-row">
                                    <span className="subscription-label">Subscription:</span>
                                    <span className="subscription-amount">{formatCurrency(school.subscriptionAmount)}/month</span>
                                </div>
                                <div className="subscription-row">
                                    <span className="subscription-label">Status:</span>
                                    {getSubscriptionStatusBadge(school.subscriptionStatus)}
                                </div>
                                <div className="subscription-row">
                                    <span className="subscription-label">Next Billing:</span>
                                    <span className="subscription-date">{formatDate(school.nextBillingDate)}</span>
                                </div>
                            </div>

                            <div className="school-admin">
                                <p className="admin-label">Principal:</p>
                                <p className="admin-credential"><strong>{school.principalName || 'Not set'}</strong></p>
                            </div>

                            <div className="school-admin mt-2">
                                <p className="admin-label">Admin Credentials:</p>
                                <p className="admin-credential"><strong>Email:</strong> {school.adminEmail}</p>
                                <p className="admin-credential"><strong>Password:</strong> {school.adminPassword}</p>
                                {school.loginUrl && (
                                    <p className="admin-credential text-xs mt-1">
                                        <strong>Login URL:</strong> {school.loginUrl}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {schools.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <Building size={80} />
                        </div>
                        <h3 className="empty-state-title">No Schools Added</h3>
                        <p className="empty-state-description">Add a school to start managing your multi-school platform</p>
                        <button className="btn btn-primary btn-lg" onClick={() => setShowModal(true)}>
                            <Plus size={20} />
                            <span>Add Your First School</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Add/Edit School Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => resetForm()}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingSchool ? 'Edit School' : 'Add New School'}</h2>
                            <button className="modal-close" onClick={() => resetForm()}>×</button>
                        </div>

                        <form onSubmit={handleSubmit} className="modal-body">
                            <div className="form-grid">
                                <div className="form-group col-span-2">
                                    <label className="form-label required">School Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="Enter school name"
                                        required
                                    />
                                </div>

                                <div className="form-group col-span-2">
                                    <label className="form-label">School Address</label>
                                    <textarea
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        className="textarea"
                                        rows="2"
                                        placeholder="Enter school address"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="+92 300 1234567"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="school@example.com"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label required">Principal Name</label>
                                    <input
                                        type="text"
                                        name="principalName"
                                        value={formData.principalName}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="Dr. Principal Name"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Principal name will appear on receipts and documents</p>
                                </div>

                                <div className="form-group">
                                    <label className="form-label required">Owner/Admin Name</label>
                                    <input
                                        type="text"
                                        name="ownerName"
                                        value={formData.ownerName}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="Owner or Admin Name for signature"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Owner/Admin name will appear at bottom of receipts for signature</p>
                                </div>

                                <div className="form-group">
                                    <label className="form-label required">Subscription Amount (PKR)</label>
                                    <input
                                        type="number"
                                        name="subscriptionAmount"
                                        value={formData.subscriptionAmount}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="50000"
                                        min="0"
                                        step="1000"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label required">Subscription Start Date</label>
                                    <input
                                        type="date"
                                        name="subscriptionStartDate"
                                        value={formData.subscriptionStartDate}
                                        onChange={handleChange}
                                        className="input"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label required">Admin Email</label>
                                    <input
                                        type="email"
                                        name="adminEmail"
                                        value={formData.adminEmail}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="admin@school.com"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label required">Admin Password</label>
                                    <input
                                        type="text"
                                        name="adminPassword"
                                        value={formData.adminPassword}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="Set password for admin"
                                        required
                                        disabled={!!editingSchool}
                                    />
                                    {editingSchool && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Password cannot be changed. Only Super Admin can set passwords.
                                        </p>
                                    )}
                                </div>

                                <div className="form-group col-span-2">
                                    <label className="form-label">School Logo</label>
                                    <div className="logo-upload">
                                        <input
                                            type="file"
                                            id="logo-upload-input"
                                            accept="image/*"
                                            onChange={handleLogoUpload}
                                            className="logo-input"
                                            style={{ display: 'none' }}
                                        />
                                        {logoPreview ? (
                                            <div className="logo-preview">
                                                <img src={logoPreview} alt="Logo preview" />
                                                <button
                                                    type="button"
                                                    className="remove-logo"
                                                    onClick={() => {
                                                        setLogoPreview(null);
                                                        setFormData(prev => ({ ...prev, logo: null, logoFile: null }));
                                                        document.getElementById('logo-upload-input').value = '';
                                                    }}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ) : (
                                            <label htmlFor="logo-upload-input" className="logo-upload-label">
                                                <Upload size={24} />
                                                <span>Click to upload logo (PNG, JPG - Max 5MB)</span>
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => resetForm()}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingSchool ? 'Update School' : 'Add School'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .schools-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                    gap: var(--spacing-xl);
                    margin-top: var(--spacing-xl);
                }

                .school-card {
                    background: white;
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--gray-200);
                    overflow: hidden;
                    transition: all 0.3s ease;
                }

                .school-card:hover {
                    box-shadow: var(--shadow-lg);
                    transform: translateY(-4px);
                }

                .school-card-header {
                    padding: var(--spacing-lg);
                    background: linear-gradient(135deg, var(--primary-50), var(--secondary-50));
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .school-logo {
                    width: 90px;
                    height: 90px;
                    object-fit: contain;
                    border-radius: var(--radius-lg);
                    background: rgba(255, 255, 255, 0.95);
                    padding: var(--spacing-sm);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    position: relative;
                    z-index: 1;
                }

                .school-logo-placeholder {
                    width: 90px;
                    height: 90px;
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: var(--radius-lg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--gray-400);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    position: relative;
                    z-index: 1;
                }

                .school-card-actions {
                    display: flex;
                    gap: var(--spacing-sm);
                    position: relative;
                    z-index: 2;
                }

                .icon-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: var(--radius-md);
                    background: rgba(255, 255, 255, 0.2);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .icon-btn:hover {
                    background: rgba(255, 255, 255, 0.3);
                    transform: scale(1.1);
                }

                .icon-btn-danger:hover {
                    background: rgba(239, 68, 68, 0.9);
                }

                .school-card-body {
                    padding: var(--spacing-lg);
                }

                .school-name {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--gray-900);
                    margin-bottom: var(--spacing-sm);
                    line-height: 1.3;
                }

                .school-address {
                    color: var(--gray-600);
                    font-size: 0.875rem;
                    margin-bottom: var(--spacing-lg);
                    line-height: 1.5;
                }

                .school-stats {
                    display: flex;
                    gap: var(--spacing-lg);
                    margin-bottom: var(--spacing-lg);
                    padding-bottom: var(--spacing-lg);
                    border-bottom: 1px solid var(--gray-200);
                }

                .school-stat {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-xs);
                    color: var(--gray-700);
                    font-size: 0.875rem;
                }

                .school-subscription {
                    background: linear-gradient(135deg, var(--gray-50) 0%, var(--gray-100) 100%);
                    padding: var(--spacing-lg);
                    border-radius: var(--radius-lg);
                    margin-bottom: var(--spacing-md);
                    border: 1px solid var(--gray-200);
                }

                .subscription-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--spacing-sm);
                }

                .subscription-row:last-child {
                    margin-bottom: 0;
                }

                .subscription-label {
                    font-size: 0.875rem;
                    color: var(--gray-600);
                }

                .subscription-amount {
                    font-size: 1rem;
                    font-weight: 600;
                    color: var(--success-600);
                }

                .subscription-date {
                    font-size: 0.875rem;
                    color: var(--gray-700);
                }

                .school-admin {
                    background: linear-gradient(135deg, var(--gray-50) 0%, var(--gray-100) 100%);
                    padding: var(--spacing-lg);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--gray-200);
                }

                .empty-state {
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: var(--spacing-4xl) var(--spacing-xl);
                    background: white;
                    border-radius: var(--radius-xl);
                    border: 2px dashed var(--gray-300);
                }

                .empty-state-icon {
                    width: 120px;
                    height: 120px;
                    margin: 0 auto var(--spacing-xl);
                    background: linear-gradient(135deg, var(--primary-100), var(--secondary-100));
                    border-radius: var(--radius-full);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--primary-600);
                }

                .empty-state-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--gray-900);
                    margin-bottom: var(--spacing-sm);
                }

                .empty-state-description {
                    font-size: 1rem;
                    color: var(--gray-600);
                    margin-bottom: var(--spacing-xl);
                    max-width: 400px;
                    margin-left: auto;
                    margin-right: auto;
                }

                .admin-label {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--gray-700);
                    margin-bottom: var(--spacing-sm);
                }

                .admin-credential {
                    font-size: 0.75rem;
                    color: var(--gray-600);
                    margin-bottom: var(--spacing-xs);
                }

                .admin-credential:last-child {
                    margin-bottom: 0;
                }

                .admin-credential strong {
                    color: var(--gray-800);
                }

                .logo-upload {
                    border: 2px dashed var(--gray-300);
                    border-radius: var(--radius-md);
                    padding: var(--spacing-xl);
                }

                .logo-upload-label {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: var(--spacing-md);
                    color: var(--gray-600);
                    cursor: pointer;
                    transition: color 0.2s ease;
                }

                .logo-upload-label:hover {
                    color: var(--primary-600);
                }

                .logo-preview {
                    position: relative;
                    width: 150px;
                    height: 150px;
                    margin: 0 auto;
                }

                .logo-preview img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    border-radius: var(--radius-md);
                }

                .remove-logo {
                    position: absolute;
                    top: -10px;
                    right: -10px;
                    width: 30px;
                    height: 30px;
                    background: var(--danger-600);
                    color: white;
                    border: none;
                    border-radius: var(--radius-full);
                    cursor: pointer;
                    font-size: 1.25rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--spacing-lg);
                }

                .col-span-2 {
                    grid-column: span 2;
                }

                .required::after {
                    content: ' *';
                    color: var(--danger-600);
                }
            `}</style>
        </div>
    );
};

export default SchoolsPage;
