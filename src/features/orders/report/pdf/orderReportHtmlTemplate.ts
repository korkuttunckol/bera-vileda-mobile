import {
  ORDER_REPORT_FOOTER,
  ORDER_REPORT_LABELS,
  ORDER_REPORT_LOGO_PATHS,
} from '../orderReport.constants';
import {
  formatOrderReportDateTime,
  resolveLogoAssetUrl,
} from '../orderReportFormat';
import type { BulkOrderReport } from '../orderReport.types';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderCustomerBlock(
  customer: BulkOrderReport['customers'][number],
  isLast: boolean,
): string {
  const rows = customer.lines
    .map(
      (line) => `
        <tr>
          <td>${escapeHtml(line.barcode || '-')}</td>
          <td>${escapeHtml(line.productName)}</td>
          <td>${escapeHtml(line.productSku)}</td>
          <td class="qty">${String(line.quantity)}</td>
        </tr>
      `,
    )
    .join('');

  const separator = isLast
    ? ''
    : '<div class="customer-separator"></div>';

  return `
    <section class="customer-block">
      <div class="customer-meta">
        <p><strong>${ORDER_REPORT_LABELS.customerCode}:</strong> ${escapeHtml(customer.customerCode)}</p>
        <p><strong>${ORDER_REPORT_LABELS.customerName}:</strong> ${escapeHtml(customer.customerName)}</p>
        <p><strong>${ORDER_REPORT_LABELS.branch}:</strong> ${escapeHtml(customer.branchName)}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>${ORDER_REPORT_LABELS.columns.barcode}</th>
            <th>${ORDER_REPORT_LABELS.columns.productName}</th>
            <th>${ORDER_REPORT_LABELS.columns.productSku}</th>
            <th class="qty">${ORDER_REPORT_LABELS.columns.quantity}</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </section>
    ${separator}
  `;
}

export function buildOrderReportHtml(report: BulkOrderReport): string {
  const beraLogo = resolveLogoAssetUrl(ORDER_REPORT_LOGO_PATHS.bera);
  const viledaLogo = resolveLogoAssetUrl(ORDER_REPORT_LOGO_PATHS.vileda);
  const customerBlocks = report.customers
    .map((customer, index) =>
      renderCustomerBlock(customer, index === report.customers.length - 1),
    )
    .join('');

  return `
    <div class="order-report">
      <style>
        .order-report {
          box-sizing: border-box;
          width: 794px;
          padding: 28px 32px 36px;
          color: #111827;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
          line-height: 1.45;
          background: #ffffff;
        }
        .order-report * { box-sizing: border-box; }
        .report-header { margin-bottom: 22px; }
        .logo-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }
        .logo-row img {
          display: block;
          height: 42px;
          width: auto;
        }
        .report-title {
          margin: 0 0 12px;
          text-align: center;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: #1e2a4a;
        }
        .report-meta p {
          margin: 0 0 4px;
        }
        .customer-block { margin-top: 18px; }
        .customer-meta p {
          margin: 0 0 4px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th, td {
          border: 1px solid #cbd5e1;
          padding: 7px 8px;
          vertical-align: top;
          text-align: left;
        }
        th {
          background: #f8fafc;
          font-size: 11px;
          font-weight: 700;
          color: #1e2a4a;
        }
        td.qty, th.qty {
          width: 72px;
          text-align: center;
        }
        .customer-separator {
          height: 1px;
          margin: 18px 0 6px;
          background: #cbd5e1;
        }
        .report-summary {
          margin-top: 24px;
          padding-top: 14px;
          border-top: 2px solid #1e2a4a;
        }
        .grand-total {
          margin: 0 0 18px;
          font-size: 14px;
          font-weight: 700;
          color: #1e2a4a;
        }
        .company-info p {
          margin: 0 0 4px;
          font-size: 12px;
        }
      </style>

      <header class="report-header">
        <div class="logo-row">
          <img src="${beraLogo}" alt="BERA" />
          <img src="${viledaLogo}" alt="Vileda Professional" />
        </div>
        <h1 class="report-title">${ORDER_REPORT_LABELS.title}</h1>
        <div class="report-meta">
          <p><strong>${ORDER_REPORT_LABELS.date}:</strong> ${escapeHtml(formatOrderReportDateTime(report.reportDate))}</p>
          <p><strong>${ORDER_REPORT_LABELS.createdBy}:</strong> ${escapeHtml(report.createdByName)}</p>
        </div>
      </header>

      ${customerBlocks}

      <footer class="report-summary">
        <p class="grand-total">${ORDER_REPORT_LABELS.grandTotal}: ${String(report.grandTotalQuantity)}</p>
        <div class="company-info">
          <p>${ORDER_REPORT_FOOTER.company}</p>
          <p>${ORDER_REPORT_FOOTER.contactName}</p>
          <p>${ORDER_REPORT_FOOTER.phone}</p>
          <p>${ORDER_REPORT_FOOTER.city}</p>
        </div>
      </footer>
    </div>
  `;
}
