export const printTable = ({ title, columns, data, footer = null }) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow popups to print report');
        return;
    }

    // Get current school data from localStorage (since we can't use hooks here)
    let schoolData = null;
    try {
        // Try multiple possible storage keys
        const storageKeys = ['school-storage', 'schools', 'current-school'];
        for (const key of storageKeys) {
            const stored = localStorage.getItem(key);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.state && parsed.state.currentSchool) {
                    schoolData = parsed.state.currentSchool;
                    break;
                } else if (parsed.state && parsed.state.schools && parsed.state.schools.length > 0) {
                    schoolData = parsed.state.schools[0];
                    break;
                } else if (parsed.currentSchool) {
                    schoolData = parsed.currentSchool;
                    break;
                } else if (Array.isArray(parsed) && parsed.length > 0) {
                    schoolData = parsed[0];
                    break;
                } else if (parsed.name) {
                    schoolData = parsed;
                    break;
                }
            }
        }
    } catch (e) {
        console.warn('Could not load school data for PDF:', e);
    }

    const schoolName = schoolData?.name || 'School Management System';
    const schoolLogo = schoolData?.logo || null;
    const ownerName = schoolData?.ownerName || 'Authorized Signatory';
    const principalName = schoolData?.principalName || null;

    const headers = columns.map(col => `<th>${col.header}</th>`).join('');

    const rows = data.map(row => {
        const cells = columns.map(col => {
            const val = col.accessor ? row[col.accessor] : col.render ? col.printValue(row) : '';
            return `<td>${val}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('');

    const footerContent = footer ? `<div class="footer">${footer}</div>` : '';

    const logoHtml = schoolLogo ? `<img src="${schoolLogo}" alt="School Logo" class="school-logo" />` : '';

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { font-family: 'Inter', sans-serif; padding: 20px; color: #111827; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
                .school-logo { max-width: 80px; max-height: 80px; margin-bottom: 10px; }
                .school-name { font-size: 28px; font-weight: bold; margin: 10px 0; text-transform: uppercase; }
                .principal-name { font-size: 12px; color: #6b7280; margin-bottom: 5px; }
                h1 { margin: 0 0 10px 0; font-size: 24px; }
                p { margin: 0; color: #6b7280; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th { background: #f9fafb; padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600; font-size: 12px; text-transform: uppercase; }
                td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
                tr:nth-child(even) { background: #f9fafb; }
                .footer { margin-top: 30px; text-align: right; font-size: 14px; font-weight: 600; }
                .date { position: absolute; top: 20px; right: 20px; font-size: 12px; color: #9ca3af; }
                .signature-section { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: right; }
                .signature-line { border-top: 1px solid #111827; width: 200px; margin-left: auto; margin-top: 50px; }
                .signature-name { margin-top: 5px; font-weight: bold; font-size: 12px; }
                .signature-label { margin-top: 3px; font-size: 10px; color: #6b7280; }
                .disclaimer { margin-top: 30px; font-size: 9px; font-style: italic; color: #6b7280; text-align: center; }
                @media print {
                    button { display: none; }
                    body { -webkit-print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <div class="date">Generated: ${new Date().toLocaleString()}</div>
            <div class="header">
                ${logoHtml}
                <div class="school-name">${schoolName}</div>
                ${principalName ? `<div class="principal-name">Principal: ${principalName}</div>` : ''}
                <h1>${title}</h1>
                <p>Official Record</p>
            </div>
            <table>
                <thead>
                    <tr>${headers}</tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
            ${footerContent}
            <div class="signature-section">
                <div class="signature-line"></div>
                <div class="signature-name">${ownerName}</div>
                <div class="signature-label">Authorized Signatory</div>
            </div>
            <div class="disclaimer">
                This is a computer-generated document. Errors and omissions are accepted. Cannot be challenged in court.
            </div>
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
};
