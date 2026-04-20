/**
 * PDF Receipt Generator (jsPDF)
 */

import { SCHOOL_INFO } from '../constants';
import { formatCurrency } from './index';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

function formatReceiptDate(date) {
    if (!date) return '—';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${mo}/${d.getFullYear()}`;
}

/**
 * @param {Object} paymentData - receipt payment fields + optional balance { totalDue, totalPaidAllTime, remaining }
 * @param {Object} studentData
 * @param {Object} schoolData - from API (name, address, phone, email, logoUrl, principalName)
 */
export const generatePaymentReceipt = async (paymentData, studentData, schoolData = null) => {
    try {
        const { jsPDF } = await import('jspdf');

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let y = 18;

        const schoolName = schoolData?.name || SCHOOL_INFO.name;
        const principalName = schoolData?.principalName || null;
        const schoolAddress = schoolData?.address || SCHOOL_INFO.address;
        const schoolPhone = schoolData?.phone || SCHOOL_INFO.phone;
        const schoolEmail = schoolData?.email || SCHOOL_INFO.email;
        const logoSrc = schoolData?.logoUrl || schoolData?.logo || null;

        if (logoSrc) {
            try {
                let imageFormat = 'PNG';
                if (logoSrc.startsWith('data:image/jpeg') || logoSrc.startsWith('data:image/jpg')) imageFormat = 'JPEG';
                else if (logoSrc.startsWith('data:image/png')) imageFormat = 'PNG';
                doc.addImage(logoSrc, imageFormat, pageWidth / 2 - 25, y, 50, 50);
                y += 55;
            } catch (e) {
                console.warn('Could not add logo to PDF:', e);
                y += 6;
            }
        }

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(String(schoolName).toUpperCase(), pageWidth / 2, y, { align: 'center' });
        y += 8;

        if (principalName) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Principal: ${principalName}`, pageWidth / 2, y, { align: 'center' });
            y += 6;
        }

        doc.setFontSize(9);
        const line = [schoolAddress, schoolPhone, schoolEmail].filter(Boolean).join(' | ');
        doc.text(line, pageWidth / 2, y, { align: 'center' });
        y += 10;

        doc.setDrawColor(120, 120, 120);
        doc.setLineWidth(0.4);
        doc.line(18, y, pageWidth - 18, y);
        y += 10;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('FEE RECEIPT', pageWidth / 2, y, { align: 'center' });
        y += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Receipt No: ${paymentData.receiptNumber || '—'}`, 22, y);
        doc.text(`Date: ${formatReceiptDate(paymentData.paidDate)}`, pageWidth - 22, y, { align: 'right' });
        y += 7;
        doc.text(`Collected By: ${paymentData.collectedByName || '—'}`, 22, y);
        y += 12;

        doc.line(18, y, pageWidth - 18, y);
        y += 8;
        doc.setFont('helvetica', 'bold');
        doc.text('STUDENT DETAILS', 22, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        doc.text(`Student Name: ${studentData.name || '—'}`, 22, y);
        y += 6;
        doc.text(`Roll Number: ${studentData.rollNumber || '—'}`, 22, y);
        y += 6;
        doc.text(`Class: ${studentData.classLabel || studentData.className || '—'}`, 22, y);
        y += 6;
        doc.text(`Section: ${studentData.sectionName || '—'}`, 22, y);
        y += 6;
        doc.text(`Parent/Guardian: ${studentData.parentName || studentData.fatherName || '—'}`, 22, y);
        y += 12;

        doc.line(18, y, pageWidth - 18, y);
        y += 8;
        doc.setFont('helvetica', 'bold');
        doc.text('PAYMENT DETAILS', 22, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        const mName = MONTHS[(paymentData.month || 1) - 1] || '';
        doc.text(`Fee Month: ${mName} ${paymentData.year || ''}`, 22, y);
        y += 6;
        doc.text(`Monthly Fee: ${formatCurrency(studentData.monthlyFee ?? 0)}`, 22, y);
        y += 6;
        doc.text(`Amount Paid: ${formatCurrency(paymentData.amount)}`, 22, y);
        y += 6;
        doc.text(`Payment Method: ${String(paymentData.paymentMethod || '').replace(/_/g, ' ')}`, 22, y);
        y += 12;

        doc.line(18, y, pageWidth - 18, y);
        y += 8;
        doc.setFont('helvetica', 'bold');
        doc.text('BALANCE SUMMARY', 22, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        const bal = paymentData.balance || {};
        const totalDue = bal.totalDue ?? 0;
        const totalPaid = bal.totalPaidAllTime ?? 0;
        const remaining = bal.remaining ?? 0;
        doc.text(`Total Due: ${formatCurrency(totalDue)}`, 22, y);
        y += 6;
        doc.text(`Total Paid (all time): ${formatCurrency(totalPaid)}`, 22, y);
        y += 6;
        if (remaining < 0) {
            doc.text(`Advance: ${formatCurrency(Math.abs(remaining))}`, 22, y);
        } else {
            doc.text(`Remaining: ${formatCurrency(remaining)}`, 22, y);
        }
        y += 14;

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.text('Thank you for your payment.', pageWidth / 2, y, { align: 'center' });
        y += 16;

        doc.setFont('helvetica', 'normal');
        doc.text('_________________________', pageWidth / 2, y, { align: 'center' });
        y += 7;
        doc.text('Authorized Signature', pageWidth / 2, y, { align: 'center' });
        y += 6;
        doc.setFont('helvetica', 'bold');
        doc.text(schoolName, pageWidth / 2, y, { align: 'center' });
        y += 12;

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.text('* This is a computer-generated receipt.', pageWidth / 2, y, { align: 'center' });

        const fileName = `Receipt_${studentData.rollNumber || 'fee'}_${Date.now()}.pdf`;
        doc.save(fileName);

        return { success: true, fileName };
    } catch (error) {
        console.error('Error generating PDF receipt:', error);
        return { success: false, error: error.message };
    }
};

export const printPaymentReceipt = async (paymentData, studentData, schoolLogo = null) => {
    try {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        doc.text('Use Download PDF for receipt', 20, 20);
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
        return { success: true };
    } catch (error) {
        console.error('Error printing receipt:', error);
        return { success: false, error: error.message };
    }
};

export const generateReceiptHTML = (paymentData, studentData, schoolLogo = null) => {
    return `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><title>Fee Payment Receipt</title></head>
        <body style="font-family: Arial, sans-serif; padding: 24px;">
            <p>${SCHOOL_INFO.name}</p>
            <p>Receipt ${paymentData.receiptNumber || ''}</p>
        </body>
        </html>
    `;
};
