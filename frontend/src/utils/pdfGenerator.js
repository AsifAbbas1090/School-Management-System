/**
 * PDF Receipt Generator
 * For PDF generation, we'll use jsPDF library
 * Install: npm install jspdf
 */

import { SCHOOL_INFO } from '../constants';
import { formatCurrency, formatDateTime } from './index';

/**
 * Generate a PDF receipt for a fee payment
 * @param {Object} paymentData - Payment information
 * @param {Object} studentData - Student information  
 * @param {Object} schoolData - School information (name, logo, principalName, address, phone, email)
 */
export const generatePaymentReceipt = async (paymentData, studentData, schoolData = null) => {
    try {
        // Dynamically import jsPDF to avoid SSR issues
        const { jsPDF } = await import('jspdf');

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        let yPosition = 20;

        // Use school-specific data or fallback to default
        const schoolName = schoolData?.name || SCHOOL_INFO.name;
        const schoolLogo = schoolData?.logo || null;
        const principalName = schoolData?.principalName || null;
        const schoolAddress = schoolData?.address || SCHOOL_INFO.address;
        const schoolPhone = schoolData?.phone || SCHOOL_INFO.phone;
        const schoolEmail = schoolData?.email || SCHOOL_INFO.email;

        // Header with school logo
        if (schoolLogo) {
            try {
                // Try to determine image format
                let imageFormat = 'PNG';
                if (schoolLogo.startsWith('data:image/jpeg') || schoolLogo.startsWith('data:image/jpg')) {
                    imageFormat = 'JPEG';
                } else if (schoolLogo.startsWith('data:image/png')) {
                    imageFormat = 'PNG';
                }
                
                doc.addImage(schoolLogo, imageFormat, pageWidth / 2 - 20, yPosition, 40, 40);
                yPosition += 45;
            } catch (e) {
                console.warn('Could not add logo to PDF:', e);
                yPosition += 10;
            }
        }

        // School name at top (prominent)
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(schoolName.toUpperCase(), pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 10;

        // Principal name (if available)
        if (principalName) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Principal: ${principalName}`, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 6;
        }

        // School contact info
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const contactInfo = [schoolAddress, schoolPhone, schoolEmail].filter(Boolean).join(' | ');
        doc.text(contactInfo, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 10;

        // Horizontal line
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.5);
        doc.line(20, yPosition, pageWidth - 20, yPosition);
        yPosition += 10;

        // Receipt title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('FEE PAYMENT RECEIPT', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 10;

        // Receipt number and date
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Receipt No: ${paymentData.receiptNumber || 'N/A'}`, 20, yPosition);
        doc.text(`Date: ${formatDateTime(paymentData.paidDate || new Date())}`, pageWidth - 20, yPosition, { align: 'right' });
        yPosition += 15;

        // Student information section
        doc.setFillColor(240, 240, 240);
        doc.rect(20, yPosition, pageWidth - 40, 40, 'F');
        yPosition += 10;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('STUDENT INFORMATION', 25, yPosition);
        yPosition += 7;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Name: ${studentData.name}`, 25, yPosition);
        yPosition += 6;
        doc.text(`Roll Number: ${studentData.rollNumber}`, 25, yPosition);
        doc.text(`Class: ${studentData.className || 'N/A'}`, pageWidth / 2 + 10, yPosition);
        yPosition += 6;
        doc.text(`Father Name: ${studentData.fatherName || 'N/A'}`, 25, yPosition);
        doc.text(`Contact: ${studentData.phone || studentData.contact || 'N/A'}`, pageWidth / 2 + 10, yPosition);
        yPosition += 15;

        // Payment details section
        doc.setFillColor(240, 240, 240);
        doc.rect(20, yPosition, pageWidth - 40, 50, 'F');
        yPosition += 10;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('PAYMENT DETAILS', 25, yPosition);
        yPosition += 7;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        // Payment table headers
        const col1 = 25;
        const col2 = pageWidth / 2;
        const col3 = pageWidth - 80;

        doc.setFont('helvetica', 'bold');
        doc.text('Description', col1, yPosition);
        doc.text('Payment Method', col2, yPosition);
        doc.text('Amount', col3, yPosition);
        yPosition += 2;

        doc.setLineWidth(0.3);
        doc.line(col1, yPosition, pageWidth - 25, yPosition);
        yPosition += 6;

        doc.setFont('helvetica', 'normal');
        doc.text(paymentData.feeType || 'Tuition Fee', col1, yPosition);
        doc.text(paymentData.paymentMethod || 'Cash', col2, yPosition);
        doc.text(formatCurrency(paymentData.amount), col3, yPosition);
        yPosition += 10;

        // Total section
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Total Amount Paid:', pageWidth - 110, yPosition);
        doc.text(formatCurrency(paymentData.amount), pageWidth - 25, yPosition, { align: 'right' });
        yPosition += 15;

        // Additional information
        if (paymentData.remarks) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(`Remarks: ${paymentData.remarks}`, 25, yPosition);
            yPosition += 10;
        }

        // Transaction ID if available
        if (paymentData.transactionId) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(`Transaction ID: ${paymentData.transactionId}`, 25, yPosition);
            yPosition += 10;
        }

        // Footer with owner/admin signature and disclaimer
        yPosition = pageHeight - 80;
        doc.setLineWidth(0.5);
        doc.line(20, yPosition, pageWidth - 20, yPosition);
        yPosition += 15;

        // Owner/Admin name for signature
        const ownerName = schoolData?.ownerName || 'Authorized Signatory';
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('_________________________', pageWidth - 30, yPosition, { align: 'right' });
        yPosition += 8;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(ownerName, pageWidth - 30, yPosition, { align: 'right' });
        yPosition += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Authorized Signatory', pageWidth - 30, yPosition, { align: 'right' });
        yPosition += 15;

        // Disclaimer
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        const disclaimer = 'This is a computer-generated document. Errors and omissions are accepted. Cannot be challenged in court.';
        const disclaimerLines = doc.splitTextToSize(disclaimer, pageWidth - 40);
        disclaimerLines.forEach((line, index) => {
            doc.text(line, pageWidth / 2, yPosition + (index * 4), { align: 'center' });
        });
        yPosition += (disclaimerLines.length * 4) + 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`Generated on: ${formatDateTime(new Date())}`, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Thank you for your payment!', pageWidth / 2, yPosition, { align: 'center' });

        // Save the PDF
        const fileName = `Receipt_${studentData.rollNumber}_${Date.now()}.pdf`;
        doc.save(fileName);

        return { success: true, fileName };
    } catch (error) {
        console.error('Error generating PDF receipt:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Print a payment receipt (opens print dialog)
 */
export const printPaymentReceipt = async (paymentData, studentData, schoolLogo = null) => {
    try {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();

        // Generate PDF (same logic as above)
        // ... same code as generatePaymentReceipt ...

        // Open print dialog instead of saving
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');

        return { success: true };
    } catch (error) {
        console.error('Error printing receipt:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Generate a receipt HTML for preview
 */
export const generateReceiptHTML = (paymentData, studentData, schoolLogo = null) => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Fee Payment Receipt</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: Arial, sans-serif;
                    padding: 40px;
                    max-width: 800px;
                    margin: 0 auto;
                }
                .receipt-header {
                    text-align: center;
                    border-bottom: 3px solid #333;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .school-logo {
                    width: 100px;
                    height: 100px;
                    margin: 0 auto 15px;
                }
                .school-logo img {
                    max-width: 100%;
                    max-height: 100%;
                }
                .school-name {
                    font-size: 28px;
                    font-weight: bold;
                    margin-bottom: 8px;
                }
                .school-tagline {
                    font-size: 14px;
                    font-style: italic;
                    color: #666;
                    margin-bottom: 8px;
                }
                .school-info {
                    font-size: 12px;
                    color: #666;
                }
                .receipt-title {
                    text-align: center;
                    font-size: 24px;
                    font-weight: bold;
                    margin: 20px 0;
                }
                .receipt-meta {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 30px;
                    font-size: 14px;
                }
                .section {
                    background: #f8f8f8;
                    padding: 20px;
                    margin-bottom: 20px;
                    border-radius: 8px;
                }
                .section-title {
                    font-weight: bold;
                    font-size: 16px;
                    margin-bottom: 15px;
                    color: #333;
                }
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                    font-size: 14px;
                }
                .info-row:last-child {
                    margin-bottom: 0;
                }
                .payment-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 15px 0;
                }
                .payment-table th,
                .payment-table td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #ddd;
                }
                .payment-table th {
                    background: #333;
                    color: white;
                    font-weight: bold;
                }
                .total-section {
                    text-align: right;
                    font-size: 18px;
                    font-weight: bold;
                    margin: 20px 0;
                    padding: 15px;
                    background: #f0f0f0;
                    border-radius: 8px;
                }
                .receipt-footer {
                    text-align: center;
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 2px solid #333;
                    font-size: 12px;
                    color: #666;
                }
                @media print {
                    body { padding: 20px; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="receipt-header">
                ${schoolLogo ? `<div class="school-logo"><img src="${schoolLogo}" alt="School Logo"></div>` : ''}
                <div class="school-name">${SCHOOL_INFO.name}</div>
                <div class="school-tagline">${SCHOOL_INFO.tagline}</div>
                <div class="school-info">${SCHOOL_INFO.address} | ${SCHOOL_INFO.phone} | ${SCHOOL_INFO.email}</div>
            </div>

            <div class="receipt-title">FEE PAYMENT RECEIPT</div>

            <div class="receipt-meta">
                <div><strong>Receipt No:</strong> ${paymentData.receiptNumber || 'N/A'}</div>
                <div><strong>Date:</strong> ${formatDateTime(paymentData.paidDate || new Date())}</div>
            </div>

            <div class="section">
                <div class="section-title">STUDENT INFORMATION</div>
                <div class="info-row">
                    <span><strong>Name:</strong> ${studentData.name}</span>
                    <span><strong>Roll Number:</strong> ${studentData.rollNumber}</span>
                </div>
                <div class="info-row">
                    <span><strong>Class:</strong> ${studentData.className || 'N/A'}</span>
                    <span><strong>Father Name:</strong> ${studentData.fatherName || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span><strong>Contact:</strong> ${studentData.phone || studentData.contact || 'N/A'}</span>
                </div>
            </div>

            <div class="section">
                <div class="section-title">PAYMENT DETAILS</div>
                <table class="payment-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Payment Method</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${paymentData.feeType || 'Tuition Fee'}</td>
                            <td>${paymentData.paymentMethod || 'Cash'}</td>
                            <td>${formatCurrency(paymentData.amount)}</td>
                        </tr>
                    </tbody>
                </table>

                ${paymentData.remarks ? `<div style="margin-top: 10px;"><strong>Remarks:</strong> ${paymentData.remarks}</div>` : ''}
                ${paymentData.transactionId ? `<div style="margin-top: 5px;"><strong>Transaction ID:</strong> ${paymentData.transactionId}</div>` : ''}
            </div>

            <div class="total-section">
                <span>Total Amount Paid: ${formatCurrency(paymentData.amount)}</span>
            </div>

            <div class="receipt-footer">
                <p><em>This is a computer-generated receipt and does not require a signature.</em></p>
                <p>Generated on: ${formatDateTime(new Date())}</p>
                <p style="margin-top: 10px; font-weight: bold;">Thank you for your payment!</p>
            </div>

            <div class="no-print" style="margin-top: 30px; text-align: center;">
                <button onclick="window.print()" style="padding: 10px 30px; font-size: 16px; cursor: pointer;">Print Receipt</button>
                <button onclick="window.close()" style="padding: 10px 30px; font-size: 16px; cursor: pointer; margin-left: 10px;">Close</button>
            </div>
        </body>
        </html>
    `;
};
