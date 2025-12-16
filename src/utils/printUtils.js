export const printTable = ({ title, columns, data, footer = null }) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow popups to print report');
        return;
    }

    const headers = columns.map(col => `<th>${col.header}</th>`).join('');

    const rows = data.map(row => {
        const cells = columns.map(col => {
            const val = col.accessor ? row[col.accessor] : col.render ? col.printValue(row) : '';
            return `<td>${val}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('');

    const footerContent = footer ? `<div class="footer">${footer}</div>` : '';

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { font-family: 'Inter', sans-serif; padding: 20px; color: #111827; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
                h1 { margin: 0 0 10px 0; font-size: 24px; }
                p { margin: 0; color: #6b7280; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th { background: #f9fafb; padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600; font-size: 12px; text-transform: uppercase; }
                td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
                tr:nth-child(even) { background: #f9fafb; }
                .footer { margin-top: 30px; text-align: right; font-size: 14px; font-weight: 600; }
                .date { position: absolute; top: 20px; right: 20px; font-size: 12px; color: #9ca3af; }
                @media print {
                    button { display: none; }
                    body { -webkit-print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <div class="date">Generated: ${new Date().toLocaleString()}</div>
            <div class="header">
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
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
};
