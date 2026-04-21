import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Plus, Receipt, Trash2, Image as ImageIcon, Search, Filter, X } from 'lucide-react';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import { useAuthStore, useExpensesStore, useSchoolStore } from '../../store';
import { expensesService, fileUploadService } from '../../services/api';
import { USER_ROLES } from '../../constants';
import { formatCurrency, formatDateTime, generateId, validateRequiredFields, getTargetSchoolIdForScopedApi } from '../../utils';
import toast from 'react-hot-toast';

const INITIAL_FORM_STATE = {
    title: '',
    amount: '',
    category: 'general',
    notes: '',
    receiptImage: null,
};

const ExpensesPage = () => {
    const { user } = useAuthStore();
    const { currentSchool } = useSchoolStore();
    const {
        expenses,
        addExpense,
        updateExpense,
        deleteExpense,
        setExpenses,
    } = useExpensesStore();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const loadExpenses = useCallback(async () => {
        setLoading(true);
        try {
            /** Request a generous page so the admin view lists every expense recorded by
             *  every manager/admin. The backend default page size is 10 which would
             *  silently hide older entries. */
            const response = await expensesService.getAll({ pageSize: 500 });
            if (response.success && response.data) {
                const expensesData = response.data.data || response.data;
                setExpenses(Array.isArray(expensesData) ? expensesData : []);
            }
        } catch (error) {
            console.error('Failed to load expenses:', error);
        } finally {
            setLoading(false);
        }
    }, [currentSchool, setExpenses]);

    /** Non-blocking background refresh — used after a create/update/delete completes. The local
     *  store is already updated optimistically, so we never want the UI to wait on this. */
    const refreshExpensesInBackground = useCallback(() => {
        expensesService
            .getAll({ pageSize: 500 })
            .then((response) => {
                if (response?.success && response.data) {
                    const expensesData = response.data.data || response.data;
                    setExpenses(Array.isArray(expensesData) ? expensesData : []);
                }
            })
            .catch((error) => {
                console.error('Failed to refresh expenses:', error);
            });
    }, [setExpenses]);

    useEffect(() => {
        loadExpenses();
    }, [loadExpenses]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [selectedExpense, setSelectedExpense] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [formState, setFormState] = useState(INITIAL_FORM_STATE);
    const [formErrors, setFormErrors] = useState({});

    const isAuthorized = [USER_ROLES.ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.SUPER_ADMIN].includes(user?.role);
    /** Only admins can edit/delete expenses — managers record only. */
    const canManageEntries = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(user?.role);

    const breadcrumbItems = [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Expenses', path: null },
    ];

    const schoolId = currentSchool?.id || null;
    const [managerFilter, setManagerFilter] = useState('');

    /** Backend already scopes results by JWT school context — we intentionally do not
     *  re-filter by `currentSchool.id` on the client. Previously, when `currentSchool`
     *  didn't exactly match the JWT schoolId (for example right after login, before
     *  the school store hydrated), all entries were silently hidden and the admin saw
     *  an empty table. */
    const filteredExpenses = useMemo(() => {
        let list = Array.isArray(expenses) ? expenses : [];

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            list = list.filter(
                (e) =>
                    e.title.toLowerCase().includes(term) ||
                    (e.notes && e.notes.toLowerCase().includes(term))
            );
        }

        if (categoryFilter) {
            list = list.filter((e) => e.category === categoryFilter);
        }

        if (managerFilter) {
            list = list.filter((e) => (e.createdById || e.User?.id) === managerFilter);
        }

        return list;
    }, [expenses, searchTerm, categoryFilter, managerFilter]);

    const totalAmount = useMemo(
        () => filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
        [filteredExpenses]
    );

    /** Per-creator rollup used for the "spend by manager" cards. Keyed by user id so
     *  the same person with different display variants collapses into one card. */
    const byManager = useMemo(() => {
        const buckets = new Map();
        for (const e of expenses || []) {
            const id = e.createdById || e.User?.id || 'unknown';
            const name = e.User?.name || 'Unknown';
            const role = e.createdByRole || e.User?.role || '';
            const bucket = buckets.get(id) || { id, name, role, count: 0, total: 0 };
            bucket.count += 1;
            bucket.total += Number(e.amount) || 0;
            buckets.set(id, bucket);
        }
        return Array.from(buckets.values()).sort((a, b) => b.total - a.total);
    }, [expenses]);

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center min-vh-50 text-center p-xl">
                <h1 className="page-title">Access Denied</h1>
                <p className="text-gray-600 max-w-md">
                    Only Admin and Management users can access the expenses module.
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

    const handleOpenModal = (expense = null) => {
        if (expense) {
            setSelectedExpense(expense);
            setFormState({
                title: expense.title,
                amount: String(expense.amount),
                category: expense.category || 'general',
                notes: expense.notes || '',
                receiptImage: expense.receiptImage || null,
            });
        } else {
            setSelectedExpense(null);
            setFormState(INITIAL_FORM_STATE);
        }
        setFormErrors({});
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedExpense(null);
        setFormState(INITIAL_FORM_STATE);
        setFormErrors({});
    };

    const handleChange = (field, value) => {
        setFormState((prev) => ({
            ...prev,
            [field]: value,
        }));
        if (formErrors[field]) {
            setFormErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const handleImageChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select a valid image file');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            handleChange('receiptImage', reader.result);
        };
        reader.readAsDataURL(file);
    };

    const validateForm = () => {
        const baseErrors = validateRequiredFields(
            {
                title: formState.title,
                amount: formState.amount,
            },
            ['title', 'amount']
        );

        const amountNumber = Number(formState.amount);
        if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
            baseErrors.amount = 'Amount must be a positive number';
        }

        setFormErrors(baseErrors);
        return Object.keys(baseErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        if (submitting) return;

        setSubmitting(true);
        try {
            let receiptImageUrl = formState.receiptImage;

            // Upload image if it's a file (base64 data URL)
            if (formState.receiptImage && formState.receiptImage.startsWith('data:image')) {
                try {
                    const response = await fetch(formState.receiptImage);
                    const blob = await response.blob();
                    const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
                    const targetSchoolId = getTargetSchoolIdForScopedApi(user, currentSchool);
                    if (!targetSchoolId) {
                        toast.error('Select a school context before uploading a receipt.');
                        return;
                    }
                    const uploadResponse = await fileUploadService.uploadExpenseReceipt(file, targetSchoolId);
                    if (uploadResponse.success && uploadResponse.data) {
                        receiptImageUrl = uploadResponse.data.receiptImageUrl || uploadResponse.data.url;
                    }
                } catch (uploadError) {
                    toast.error('Failed to upload receipt image');
                }
            }

            const payload = {
                title: formState.title.trim(),
                amount: Number(formState.amount),
                category: formState.category || 'general',
                notes: formState.notes?.trim() || '',
                receiptImageUrl: receiptImageUrl || null,
            };

            if (selectedExpense) {
                const response = await expensesService.update(selectedExpense.id, payload);
                if (response.success && response.data) {
                    /** Optimistic: merge the server row into local state and close immediately. */
                    updateExpense(selectedExpense.id, response.data);
                    toast.success('Expense updated successfully');
                    handleCloseModal();
                    refreshExpensesInBackground();
                } else {
                    toast.error(response.error || 'Failed to update expense');
                }
            } else {
                const response = await expensesService.create(payload);
                if (response.success && response.data) {
                    addExpense(response.data);
                    toast.success('Expense added successfully');
                    handleCloseModal();
                    refreshExpensesInBackground();
                } else {
                    toast.error(response.error || 'Failed to create expense');
                }
            }
        } catch (error) {
            console.error('Expense creation error:', error);
            toast.error(error?.response?.data?.message || error?.message || 'Failed to save expense');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (expense) => {
        if (!window.confirm('Are you sure you want to delete this expense?')) return;

        setDeletingId(expense.id);
        /** Optimistic: remove from local list immediately; restore on error. */
        deleteExpense(expense.id);
        try {
            const response = await expensesService.delete(expense.id);
            if (response.success) {
                toast.success('Expense removed');
                refreshExpensesInBackground();
            } else {
                toast.error(response.error || 'Failed to delete expense');
                /** Rollback by refetching the canonical list. */
                loadExpenses();
            }
        } catch (error) {
            toast.error('Failed to delete expense');
            loadExpenses();
        } finally {
            setDeletingId(null);
        }
    };

    const openImagePreview = (imageSrc) => {
        setPreviewImage(imageSrc);
        setIsPreviewOpen(true);
    };

    const categories = ['general', 'utilities', 'salary', 'maintenance', 'stationery', 'transport'];

    return (
        <div className="expenses-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="page-header">
                <div>
                    <h1 className="page-title">Expenses</h1>
                    <p className="text-gray-600">
                        Track operational expenses with optional receipt images.
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                    <Plus size={18} />
                    <span>Add Expense</span>
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 mb-xl gap-4">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, var(--error-500), var(--error-600))' }}>
                        <Receipt size={22} />
                    </div>
                    <div>
                        <div className="stat-value">{formatCurrency(totalAmount)}</div>
                        <div className="stat-label">Total Recorded Expenses</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, var(--gray-500), var(--gray-600))' }}>
                        <Filter size={22} />
                    </div>
                    <div>
                        <div className="stat-value">{filteredExpenses.length}</div>
                        <div className="stat-label">Entries (Current View)</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, var(--success-500), var(--success-600))' }}>
                        <ImageIcon size={22} />
                    </div>
                    <div>
                        <div className="stat-value">
                            {filteredExpenses.filter((e) => !!e.receiptImage).length}
                        </div>
                        <div className="stat-label">With Receipt Images</div>
                    </div>
                </div>
            </div>

            {/* Spend-by-manager rollup — one card per creator (manager/admin). Clicking a
                card narrows the table below to that person's entries. */}
            {byManager.length > 0 && (
                <div className="manager-spend-grid mb-xl">
                    <button
                        type="button"
                        className={`manager-card ${managerFilter === '' ? 'active' : ''}`}
                        onClick={() => setManagerFilter('')}
                        title="Show everyone"
                    >
                        <div className="manager-avatar manager-avatar-all">ALL</div>
                        <div className="manager-body">
                            <div className="manager-name">Everyone</div>
                            <div className="manager-sub">
                                {expenses?.length || 0} {(expenses?.length || 0) === 1 ? 'entry' : 'entries'}
                            </div>
                            <div className="manager-total">
                                {formatCurrency((expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0))}
                            </div>
                        </div>
                    </button>
                    {byManager.map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            className={`manager-card ${managerFilter === m.id ? 'active' : ''}`}
                            onClick={() => setManagerFilter(managerFilter === m.id ? '' : m.id)}
                            title={`Filter to ${m.name}'s expenses`}
                        >
                            <div className="manager-avatar">
                                {(m.name || '?').trim().split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                            <div className="manager-body">
                                <div className="manager-name">{m.name}</div>
                                <div className="manager-sub">
                                    {m.role && <span className="manager-role">{m.role.toLowerCase()}</span>}
                                    <span>{m.count} {m.count === 1 ? 'entry' : 'entries'}</span>
                                </div>
                                <div className="manager-total">{formatCurrency(m.total)}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="card mb-lg p-lg">
                <div className="filters-grid">
                    <div className="search-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search by title or notes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input"
                        />
                    </div>

                    <div className="flex gap-md">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="select"
                        >
                            <option value="">All Categories</option>
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </option>
                            ))}
                        </select>
                        {byManager.length > 0 && (
                            <select
                                value={managerFilter}
                                onChange={(e) => setManagerFilter(e.target.value)}
                                className="select"
                                title="Filter by person who added the expense"
                            >
                                <option value="">All Managers</option>
                                {byManager.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name}{m.role ? ` — ${m.role.toLowerCase()}` : ''}
                                    </option>
                                ))}
                            </select>
                        )}
                        {(searchTerm || categoryFilter || managerFilter) && (
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => {
                                    setSearchTerm('');
                                    setCategoryFilter('');
                                    setManagerFilter('');
                                }}
                                title="Clear filters"
                            >
                                <X size={16} /> Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Amount</th>
                            <th>Created By</th>
                            <th>Date</th>
                            <th>Receipt</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredExpenses.length === 0 && (
                            <tr>
                                <td colSpan="7" className="text-center text-gray-500 py-lg">
                                    No expenses recorded yet. Click “Add Expense” to create one.
                                </td>
                            </tr>
                        )}
                        {filteredExpenses.map((expense) => (
                            <tr key={expense.id}>
                                <td className="font-medium">
                                    {expense.title}
                                    {expense.notes && (
                                        <div className="text-xs text-gray-500 mt-1">
                                            {expense.notes}
                                        </div>
                                    )}
                                </td>
                                <td className="text-sm capitalize">
                                    <span className="badge badge-outline">
                                        {expense.category || 'general'}
                                    </span>
                                </td>
                                <td className="text-error-600 font-semibold">
                                    {formatCurrency(expense.amount)}
                                </td>
                                <td className="text-sm text-gray-600">
                                    {expense.User?.name && (
                                        <span className="block font-medium" style={{ color: 'var(--text-primary)' }}>
                                            {expense.User.name}
                                        </span>
                                    )}
                                    {expense.createdByRole && (
                                        <span className="block text-xs capitalize text-gray-500">
                                            {expense.createdByRole.toLowerCase()}
                                        </span>
                                    )}
                                    {expense.Editor?.name && (
                                        <span className="block text-xs text-gray-400" style={{ fontStyle: 'italic' }}>
                                            edited by {expense.Editor.name}
                                        </span>
                                    )}
                                </td>
                                <td className="text-sm text-gray-600">
                                    {formatDateTime(new Date(expense.createdAt))}
                                </td>
                                <td>
                                    {expense.receiptImage ? (
                                        <button
                                            className="btn btn-sm btn-outline"
                                            onClick={() => openImagePreview(expense.receiptImage)}
                                        >
                                            <ImageIcon size={16} />
                                            <span>View</span>
                                        </button>
                                    ) : (
                                        <span className="text-xs text-gray-400">
                                            No image
                                        </span>
                                    )}
                                </td>
                                <td>
                                    <div className="flex gap-sm justify-end">
                                        {canManageEntries ? (
                                            <>
                                                <button
                                                    className="btn btn-sm btn-outline"
                                                    onClick={() => handleOpenModal(expense)}
                                                    disabled={deletingId === expense.id}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-danger"
                                                    onClick={() => handleDelete(expense)}
                                                    disabled={deletingId === expense.id}
                                                    title="Delete expense"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </>
                                        ) : (
                                            <span className="text-xs text-gray-400" title="Only administrators can edit or delete expenses once recorded">
                                                Locked
                                            </span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create / Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={selectedExpense ? 'Edit Expense' : 'Add Expense'}
                size="md"
                footer={
                    <>
                        <button className="btn btn-outline" onClick={handleCloseModal} disabled={submitting}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                            {submitting ? 'Saving…' : 'Save'}
                        </button>
                    </>
                }
            >
                <div className="grid gap-md">
                    <div className="form-group">
                        <label className="form-label">
                            Title <span className="text-error-600">*</span>
                        </label>
                        <input
                            type="text"
                            value={formState.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                            className={`input ${formErrors.title ? 'input-error' : ''}`}
                            placeholder="e.g. Generator Fuel, Printing, Event Catering"
                        />
                        {formErrors.title && (
                            <p className="text-xs text-error-600 mt-1">{formErrors.title}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-md">
                        <div className="form-group">
                            <label className="form-label">
                                Amount (PKR) <span className="text-error-600">*</span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={formState.amount}
                                onChange={(e) => handleChange('amount', e.target.value)}
                                className={`input ${formErrors.amount ? 'input-error' : ''}`}
                                placeholder="Enter amount"
                            />
                            {formErrors.amount && (
                                <p className="text-xs text-error-600 mt-1">{formErrors.amount}</p>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Category</label>
                            <select
                                value={formState.category}
                                onChange={(e) => handleChange('category', e.target.value)}
                                className="select"
                            >
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notes (optional)</label>
                        <textarea
                            rows="3"
                            value={formState.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            className="textarea"
                            placeholder="Add any additional details for this expense"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Receipt Image (optional)</label>
                        <div className="flex items-center gap-md">
                            <label className="btn btn-outline cursor-pointer">
                                <ImageIcon size={16} />
                                <span>{formState.receiptImage ? 'Change Image' : 'Upload Image'}</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageChange}
                                />
                            </label>
                            {formState.receiptImage && (
                                <button
                                    type="button"
                                    className="btn btn-ghost text-error-600 text-xs flex items-center gap-1"
                                    onClick={() => handleChange('receiptImage', null)}
                                >
                                    <X size={14} />
                                    Remove
                                </button>
                            )}
                        </div>
                        {formState.receiptImage && (
                            <div className="mt-3">
                                <img
                                    src={formState.receiptImage}
                                    alt="Receipt preview"
                                    style={{ height: "96px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", objectFit: "cover", cursor: "pointer" }}
                                    onClick={() => openImagePreview(formState.receiptImage)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Image Preview Modal */}
            <Modal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                title="Receipt Image"
                size="lg"
                footer={
                    <button
                        className="btn btn-outline"
                        onClick={() => setIsPreviewOpen(false)}
                    >
                        Close
                    </button>
                }
            >
                {previewImage && (
                    <div className="flex justify-center">
                        <img
                            src={previewImage}
                            alt="Receipt"
                            style={{ maxHeight: "70vh", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-color)", objectFit: "contain" }}
                        />
                    </div>
                )}
            </Modal>

            <style>{`
                .expenses-page {
                    animation: fadeIn 0.3s ease-in-out;
                }

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--spacing-xl);
                }

                .page-header h1 {
                    font-size: 2rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: var(--spacing-xs);
                }

                .stat-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: var(--spacing-lg);
                    box-shadow: var(--shadow-sm);
                    display: flex;
                    gap: var(--spacing-md);
                    align-items: center;
                    transition: box-shadow var(--transition-base);
                }
                .stat-card:hover { box-shadow: var(--shadow-md); }

                .stat-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: var(--radius-lg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    flex-shrink: 0;
                }

                .stat-value {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .stat-label {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }

                .filters-grid {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: var(--spacing-md);
                    align-items: center;
                }

                .search-box {
                    position: relative;
                }

                .search-icon {
                    position: absolute;
                    left: 0.875rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--gray-400);
                }

                .search-box input {
                    padding-left: 2.75rem;
                }

                .input-error {
                    border-color: var(--error-500);
                }

                /* Spend-by-manager rollup cards */
                .manager-spend-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                    gap: var(--spacing-md);
                }
                .manager-card {
                    text-align: left;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: var(--spacing-md);
                    display: flex;
                    gap: var(--spacing-md);
                    align-items: center;
                    cursor: pointer;
                    transition: border-color var(--transition-base), box-shadow var(--transition-base), transform var(--transition-base);
                    box-shadow: var(--shadow-sm);
                    color: var(--text-primary);
                }
                .manager-card:hover {
                    border-color: var(--primary-accent, var(--primary-500));
                    box-shadow: var(--shadow-md);
                    transform: translateY(-1px);
                }
                .manager-card.active {
                    border-color: var(--primary-600);
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
                }
                .manager-avatar {
                    flex-shrink: 0;
                    width: 44px;
                    height: 44px;
                    border-radius: var(--radius-full);
                    background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 0.9rem;
                    letter-spacing: 0.02em;
                }
                .manager-avatar-all {
                    background: linear-gradient(135deg, var(--gray-500), var(--gray-700));
                    font-size: 0.75rem;
                }
                .manager-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
                .manager-name {
                    font-weight: 600;
                    color: var(--text-primary);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .manager-sub {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    display: flex;
                    gap: 0.5rem;
                    align-items: center;
                    text-transform: capitalize;
                }
                .manager-role {
                    background: var(--primary-100);
                    color: var(--primary-accent, var(--primary-700));
                    padding: 1px 8px;
                    border-radius: var(--radius-full);
                    font-size: 0.6875rem;
                    font-weight: 600;
                    letter-spacing: 0.03em;
                }
                .manager-total {
                    font-size: 1rem;
                    font-weight: 700;
                    color: var(--error-600);
                    margin-top: 2px;
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

export default ExpensesPage;


