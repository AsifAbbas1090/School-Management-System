import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Plus, Receipt, Trash2, Image as ImageIcon, Search, Filter, X } from 'lucide-react';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import { useAuthStore, useExpensesStore, useSchoolStore } from '../../store';
import { expensesService, fileUploadService } from '../../services/api';
import { USER_ROLES } from '../../constants';
import { formatCurrency, formatDateTime, generateId, validateRequiredFields } from '../../utils';
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

    const loadExpenses = useCallback(async () => {
        setLoading(true);
        try {
            const response = await expensesService.getAll();
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

    const isAuthorized = [USER_ROLES.ADMIN, USER_ROLES.MANAGEMENT].includes(user?.role);

    const breadcrumbItems = [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Expenses', path: null },
    ];

    const schoolId = currentSchool?.id || null;

    const filteredExpenses = useMemo(() => {
        let list = expenses || [];

        if (schoolId) {
            list = list.filter((e) => e.schoolId === schoolId);
        }

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

        return list;
    }, [expenses, schoolId, searchTerm, categoryFilter]);

    const totalAmount = useMemo(
        () => filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
        [filteredExpenses]
    );

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center min-vh-50 text-center p-xl">
                <h1 className="text-2xl font-bold mb-sm">Access Denied</h1>
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

        try {
            let receiptImageUrl = formState.receiptImage;

            // Upload image if it's a file (base64 data URL)
            if (formState.receiptImage && formState.receiptImage.startsWith('data:image')) {
                try {
                    // Convert base64 to blob
                    const response = await fetch(formState.receiptImage);
                    const blob = await response.blob();
                    const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
                    
                    const uploadResponse = await fileUploadService.uploadExpenseReceipt(file);
                    if (uploadResponse.success && uploadResponse.data) {
                        receiptImageUrl = uploadResponse.data.receiptImageUrl || uploadResponse.data.url;
                    }
                } catch (uploadError) {
                    // Silently handle errors - toast shows user message
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
                    updateExpense(selectedExpense.id, response.data);
                    toast.success('Expense updated successfully');
                    loadExpenses();
                } else {
                    toast.error(response.error || 'Failed to update expense');
                    return;
                }
            } else {
                const response = await expensesService.create(payload);
                if (response.success && response.data) {
                    addExpense(response.data);
                    toast.success('Expense added successfully');
                    await loadExpenses();
                } else {
                    toast.error(response.error || 'Failed to create expense');
                    return;
                }
            }

            handleCloseModal();
        } catch (error) {
            console.error('Expense creation error:', error);
            toast.error(error?.response?.data?.message || error?.message || 'Failed to save expense');
        }
    };

    const handleDelete = async (expense) => {
        if (!window.confirm('Are you sure you want to delete this expense?')) return;
        
        try {
            const response = await expensesService.delete(expense.id);
            if (response.success) {
                deleteExpense(expense.id);
                toast.success('Expense removed');
                loadExpenses();
            } else {
                toast.error(response.error || 'Failed to delete expense');
            }
        } catch (error) {
            // Silently handle errors - toast shows user message
            toast.error('Failed to delete expense');
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
                    <h1>Expenses</h1>
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
                    <div className="stat-icon bg-gradient-to-br from-red-500 to-red-600">
                        <Receipt size={22} />
                    </div>
                    <div>
                        <div className="stat-value">{formatCurrency(totalAmount)}</div>
                        <div className="stat-label">Total Recorded Expenses</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon bg-gradient-to-br from-slate-500 to-slate-600">
                        <Filter size={22} />
                    </div>
                    <div>
                        <div className="stat-value">{filteredExpenses.length}</div>
                        <div className="stat-label">Entries (Current View)</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon bg-gradient-to-br from-emerald-500 to-emerald-600">
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
                                    {expense.createdByRole && (
                                        <span className="block capitalize">
                                            {expense.createdByRole}
                                        </span>
                                    )}
                                    {expense.createdById && (
                                        <span className="block text-xs text-gray-400">
                                            ID: {expense.createdById}
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
                                        <button
                                            className="btn btn-sm btn-outline"
                                            onClick={() => handleOpenModal(expense)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="btn btn-sm btn-danger"
                                            onClick={() => handleDelete(expense)}
                                        >
                                            <Trash2 size={14} />
                                        </button>
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
                        <button className="btn btn-outline" onClick={handleCloseModal}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={handleSubmit}>
                            Save
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
                                    className="h-24 rounded-md border border-gray-200 object-cover cursor-pointer"
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
                            className="max-h-[70vh] rounded-lg border border-gray-200 object-contain"
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
                    color: var(--gray-900);
                    margin-bottom: var(--spacing-xs);
                }

                .stat-card {
                    background: white;
                    border-radius: var(--radius-lg);
                    padding: var(--spacing-lg);
                    box-shadow: var(--shadow-sm);
                    display: flex;
                    gap: var(--spacing-md);
                    align-items: center;
                }

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
                    color: var(--gray-900);
                }

                .stat-label {
                    font-size: 0.875rem;
                    color: var(--gray-600);
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


