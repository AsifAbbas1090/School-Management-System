import React, { useState } from 'react';
import { Upload, Download, FileText, AlertCircle } from 'lucide-react';
import Modal from '../common/Modal';
import toast from 'react-hot-toast';

const CSVImport = ({ type = 'students', onImport, onClose }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState([]);
    const [errors, setErrors] = useState([]);

    const templates = {
        students: {
            headers: ['name', 'rollNumber', 'email', 'phone', 'fatherName', 'class', 'section', 'fees', 'admissionDate', 'address'],
            sample: [
                ['John Doe', 'STU001', 'john@example.com', '1234567890', 'Robert Doe', 'Class 5', 'A', '5000', '2024-01-15', '123 Main St'],
                ['Jane Smith', 'STU002', 'jane@example.com', '0987654321', 'Michael Smith', 'Class 4', 'B', '5000', '2024-01-16', '456 Oak Ave'],
            ]
        },
        attendance: {
            headers: ['name', 'rollNumber', 'status'],
            sample: [
                ['John Doe', 'STU001', 'present'],
                ['Jane Smith', 'STU002', 'absent'],
                ['Mike Johnson', 'STU003', 'present'],
            ]
        },
        examMarks: {
            headers: ['rollNumber', 'subject', 'marks'],
            sample: [
                ['STU001', 'Mathematics', '85'],
                ['STU002', 'Mathematics', '92'],
                ['STU003', 'Mathematics', '78'],
            ]
        },
        feeCollection: {
            headers: ['rollNumber', 'studentName', 'feeReceived'],
            sample: [
                ['STU001', 'John Doe', '5000'],
                ['STU002', 'Jane Smith', '2500'],
            ]
        },
        parents: {
            headers: ['name', 'email', 'phone', 'occupation', 'address', 'linkedStudentRollNumbers'],
            sample: [
                ['Michael Brown', 'michael@parent.com', '1234567890', 'Engineer', '123 Main St', 'STU001;STU002'],
                ['Sarah Connor', 'sarah@parent.com', '0987654321', 'Doctor', '456 Oak Ave', 'STU003'],
            ]
        },
        teachers: {
            headers: ['name', 'email', 'employeeId', 'phone', 'salary', 'joiningDate', 'subjects'],
            sample: [
                ['Robert Langdon', 'robert@school.com', 'EMP005', '1239998888', '55000', '2023-08-01', 'Math;History'],
                ['Minerva McGonagall', 'minerva@school.com', 'EMP006', '9871112222', '62000', '2020-01-15', 'English;Science'],
            ]
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        if (!selectedFile.name.endsWith('.csv')) {
            toast.error('Please select a CSV file');
            return;
        }

        setFile(selectedFile);
        parseCSV(selectedFile);
    };

    const parseCSV = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = text.split('\n').filter(line => line.trim());

            if (lines.length < 2) {
                toast.error('CSV file is empty or invalid');
                return;
            }

            const headers = lines[0].split(',').map(h => h.trim());
            const expectedHeaders = templates[type].headers;

            // Validate headers
            const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
            if (missingHeaders.length > 0) {
                setErrors([`Missing required columns: ${missingHeaders.join(', ')}`]);
                return;
            }

            // Parse data
            const data = [];
            const parseErrors = [];

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                const row = {};

                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });

                // Validate row
                if (type === 'students') {
                    if (!row.name || !row.rollNumber) {
                        parseErrors.push(`Row ${i}: Name and Roll Number are required`);
                        continue;
                    }
                } else if (type === 'attendance') {
                    if (!row.name || !row.rollNumber || !row.status) {
                        parseErrors.push(`Row ${i}: Name, Roll Number, and Status are required`);
                        continue;
                    }
                    if (!['present', 'absent', 'leave'].includes(row.status.toLowerCase())) {
                        parseErrors.push(`Row ${i}: Status must be present, absent, or leave`);
                        continue;
                    }
                } else if (type === 'examMarks') {
                    if (!row.rollNumber || !row.subject || !row.marks) {
                        parseErrors.push(`Row ${i}: Roll Number, Subject, and Marks are required`);
                        continue;
                    }
                    // Validate marks is a number
                    if (isNaN(row.marks)) {
                        parseErrors.push(`Row ${i}: Marks must be a valid number`);
                        continue;
                    }
                } else if (type === 'feeCollection') {
                    if (!row.rollNumber || !row.feeReceived) {
                        parseErrors.push(`Row ${i}: Roll Number and Fee Received are required`);
                        continue;
                    }
                } else if (type === 'parents') {
                    if (!row.name || !row.email || !row.phone) {
                        parseErrors.push(`Row ${i}: Name, Email and Phone are required`);
                        continue;
                    }
                } else if (type === 'teachers') {
                    if (!row.name || !row.email || !row.employeeId || !row.salary) {
                        parseErrors.push(`Row ${i}: Name, Email, EmployeeID, and Salary are required`);
                        continue;
                    }
                }

                data.push(row);
            }

            setPreview(data);
            setErrors(parseErrors);

            if (parseErrors.length === 0) {
                toast.success(`${data.length} records loaded successfully`);
            } else {
                toast.error(`${parseErrors.length} errors found. Please check the preview.`);
            }
        };

        reader.readAsText(file);
    };

    const handleImport = () => {
        if (preview.length === 0) {
            toast.error('No data to import');
            return;
        }

        if (errors.length > 0) {
            toast.error('Please fix errors before importing');
            return;
        }

        onImport(preview);
        toast.success(`${preview.length} records imported successfully`);
        onClose();
    };

    const downloadTemplate = () => {
        const template = templates[type];
        const csvContent = [
            template.headers.join(','),
            ...template.sample.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${type}_template.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success('Template downloaded');
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={`Import ${type === 'students' ? 'Students' : 'Attendance'} from CSV`}
            size="xl"
            footer={
                <>
                    <button className="btn btn-outline" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleImport}
                        disabled={preview.length === 0 || errors.length > 0}
                    >
                        <Upload size={18} />
                        <span>Import {preview.length} Records</span>
                    </button>
                </>
            }
        >
            <div className="csv-import">
                {/* Download Template */}
                <div className="template-section">
                    <div className="template-info">
                        <FileText size={20} className="text-primary-600" />
                        <div>
                            <h4 className="template-title">Download Template</h4>
                            <p className="template-description">
                                Download the CSV template with required columns and sample data
                            </p>
                        </div>
                    </div>
                    <button className="btn btn-outline btn-sm" onClick={downloadTemplate}>
                        <Download size={16} />
                        <span>Download Template</span>
                    </button>
                </div>

                {/* Required Columns */}
                <div className="required-columns">
                    <h4 className="section-title">Required Columns:</h4>
                    <div className="columns-list">
                        {templates[type].headers.map((header, index) => (
                            <span key={index} className="column-badge">{header}</span>
                        ))}
                    </div>
                </div>

                {/* File Upload */}
                <div className="upload-section">
                    <label className="upload-area">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                        <Upload size={32} className="upload-icon" />
                        <div className="upload-text">
                            <p className="upload-title">
                                {file ? file.name : 'Click to upload CSV file'}
                            </p>
                            <p className="upload-subtitle">or drag and drop</p>
                        </div>
                    </label>
                </div>

                {/* Errors */}
                {errors.length > 0 && (
                    <div className="errors-section">
                        <div className="error-header">
                            <AlertCircle size={18} className="text-error-600" />
                            <h4 className="error-title">{errors.length} Error(s) Found</h4>
                        </div>
                        <ul className="error-list">
                            {errors.map((error, index) => (
                                <li key={index} className="error-item">{error}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Preview */}
                {preview.length > 0 && (
                    <div className="preview-section">
                        <h4 className="section-title">Preview ({preview.length} records)</h4>
                        <div className="preview-table-container">
                            <table className="preview-table">
                                <thead>
                                    <tr>
                                        {templates[type].headers.map((header, index) => (
                                            <th key={index}>{header}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.slice(0, 10).map((row, index) => (
                                        <tr key={index}>
                                            {templates[type].headers.map((header, colIndex) => (
                                                <td key={colIndex}>{row[header]}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {preview.length > 10 && (
                                <p className="preview-note">Showing first 10 of {preview.length} records</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
        .csv-import {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
          max-height: 70vh;
          overflow-y: auto;
        }

        .template-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-md);
          background: var(--primary-50);
          border-radius: var(--radius-md);
          border: 1px solid var(--primary-200);
        }

        .template-info {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .template-title {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--gray-900);
          margin-bottom: 0.25rem;
        }

        .template-description {
          font-size: 0.8125rem;
          color: var(--gray-600);
          margin: 0;
        }

        .required-columns {
          padding: var(--spacing-md);
          background: var(--gray-50);
          border-radius: var(--radius-md);
        }

        .section-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--gray-900);
          margin-bottom: var(--spacing-sm);
        }

        .columns-list {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-xs);
        }

        .column-badge {
          padding: 0.25rem 0.75rem;
          background: white;
          border: 1px solid var(--gray-300);
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--gray-700);
        }

        .upload-section {
          padding: var(--spacing-md);
        }

        .upload-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-xl);
          border: 2px dashed var(--gray-300);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .upload-area:hover {
          border-color: var(--primary-500);
          background: var(--primary-50);
        }

        .upload-icon {
          color: var(--gray-400);
          margin-bottom: var(--spacing-md);
        }

        .upload-text {
          text-align: center;
        }

        .upload-title {
          font-size: 0.9375rem;
          font-weight: 500;
          color: var(--gray-900);
          margin-bottom: 0.25rem;
        }

        .upload-subtitle {
          font-size: 0.8125rem;
          color: var(--gray-500);
          margin: 0;
        }

        .errors-section {
          padding: var(--spacing-md);
          background: var(--error-50);
          border: 1px solid var(--error-200);
          border-radius: var(--radius-md);
        }

        .error-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-sm);
        }

        .error-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--error-900);
          margin: 0;
        }

        .error-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .error-item {
          font-size: 0.8125rem;
          color: var(--error-700);
          padding: 0.25rem 0;
        }

        .preview-section {
          padding: var(--spacing-md);
          background: var(--gray-50);
          border-radius: var(--radius-md);
        }

        .preview-table-container {
          overflow-x: auto;
          margin-top: var(--spacing-sm);
        }

        .preview-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .preview-table th,
        .preview-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid var(--gray-200);
          font-size: 0.8125rem;
        }

        .preview-table th {
          background: var(--gray-100);
          font-weight: 600;
          color: var(--gray-900);
        }

        .preview-table td {
          color: var(--gray-700);
        }

        .preview-note {
          font-size: 0.75rem;
          color: var(--gray-500);
          text-align: center;
          margin-top: var(--spacing-sm);
        }
      `}</style>
        </Modal>
    );
};

export default CSVImport;
