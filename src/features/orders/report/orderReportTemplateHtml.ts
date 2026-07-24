import { ORDER_REPORT_LOGO_PATHS, ORDER_REPORT_LABELS } from './orderReport.constants';
import { ORDER_REPORT_LAYOUT } from './orderReportLayout';
import { resolveLogoAssetUrl } from './orderReportAssets';
import type { OrderReportTemplateModel } from './orderReportTemplateModel';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderCustomerMeta(
  customer: OrderReportTemplateModel['customers'][number],
): string {
  const fields = [
    {
      label: ORDER_REPORT_LABELS.sequenceNumber,
      value: String(customer.sequenceNumber),
    },
    {
      label: ORDER_REPORT_LABELS.customerCode,
      value: customer.customerCode,
    },
    {
      label: ORDER_REPORT_LABELS.customerName,
      value: customer.customerName,
    },
    {
      label: ORDER_REPORT_LABELS.branch,
      value: customer.branchName,
    },
  ];

  const rows = fields
    .map(
      (field) => `
        <div class="meta-row">
          <span class="meta-label">${escapeHtml(field.label)}</span>
          <span class="meta-value">${escapeHtml(field.value)}</span>
        </div>
      `,
    )
    .join('');

  return `
    <div class="customer-meta">
      <div class="customer-meta-left">${rows}</div>
      <div class="customer-total-box">
        <div class="customer-total-label">${ORDER_REPORT_LABELS.totalQuantity}</div>
        <div class="customer-total-value">${String(customer.totalQuantity)}</div>
      </div>
    </div>
  `;
}

function renderCustomerSection(
  customer: OrderReportTemplateModel['customers'][number],
  isLast: boolean,
): string {
  const tableRows = customer.tableRows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.barcode)}</td>
          <td>${escapeHtml(row.productSku)}</td>
          <td>${escapeHtml(row.productName)}</td>
          <td>${String(row.quantity)}</td>
        </tr>
      `,
    )
    .join('');

  const separator = isLast ? '' : '<hr class="customer-separator" />';

  return `
    <section class="customer-section">
      ${renderCustomerMeta(customer)}
      <table class="product-table">
        <thead>
          <tr>
            ${customer.tableHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </section>
    ${separator}
  `;
}

export function buildOrderReportTemplateHtml(model: OrderReportTemplateModel): string {
  const beraLogo = resolveLogoAssetUrl(ORDER_REPORT_LOGO_PATHS.bera);
  const viledaLogo = resolveLogoAssetUrl(ORDER_REPORT_LOGO_PATHS.vileda);
  const { colors, fonts } = ORDER_REPORT_LAYOUT;

  const customerSections = model.customers
    .map((customer, index) => renderCustomerSection(customer, index === model.customers.length - 1))
    .join('');

  return `
    <div class="order-report-root">
      <style>
        .order-report-root {
          box-sizing: border-box;
          width: 794px;
          padding: 24px 28px 32px;
          background: #ffffff;
          color: ${colors.text};
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
          line-height: 1.4;
        }
        .order-report-root * { box-sizing: border-box; }

        .report-header-row {
          display: grid;
          grid-template-columns: 180px 1fr 220px;
          align-items: center;
          column-gap: 12px;
          min-height: 48px;
        }
        .report-header-row img {
          display: block;
          height: 42px;
          width: auto;
          max-width: 100%;
          object-fit: contain;
        }
        .logo-bera { justify-self: start; }
        .logo-vileda { justify-self: end; }
        .report-title {
          margin: 0;
          text-align: center;
          font-size: ${String(fonts.titlePt + 2)}px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: ${colors.navy};
        }

        .report-red-line {
          height: 3px;
          margin: 10px 0 12px;
          background: ${colors.red};
          border: none;
        }

        .report-meta p {
          margin: 0 0 4px;
          font-size: 11px;
          color: ${colors.text};
        }

        .customer-section {
          margin-top: 14px;
        }

        .customer-meta {
          display: grid;
          grid-template-columns: 1fr 168px;
          border: 1px solid ${colors.border};
          margin-bottom: 8px;
          min-height: 112px;
        }
        .customer-meta-left {
          display: flex;
          flex-direction: column;
        }
        .meta-row {
          display: grid;
          grid-template-columns: 132px 1fr;
          flex: 1;
          border-bottom: 1px solid ${colors.border};
        }
        .meta-row:last-child {
          border-bottom: none;
        }
        .meta-label {
          padding: 8px 10px;
          background: ${colors.customerLabelBg};
          border-right: 1px solid ${colors.border};
          font-size: 11px;
          font-weight: 700;
          color: ${colors.navy};
          display: flex;
          align-items: center;
        }
        .meta-value {
          padding: 8px 10px;
          background: #ffffff;
          font-size: 11px;
          display: flex;
          align-items: center;
        }

        .customer-total-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-left: 1px solid ${colors.border};
          background: ${colors.customerTotalBoxBg};
          padding: 10px 8px;
          text-align: center;
        }
        .customer-total-label {
          font-size: 11px;
          font-weight: 700;
          color: ${colors.navy};
          margin-bottom: 8px;
        }
        .customer-total-value {
          font-size: ${String(fonts.customerTotalPt + 4)}px;
          font-weight: 700;
          line-height: 1;
          color: ${colors.navy};
        }

        .product-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        .product-table th,
        .product-table td {
          border: 1px solid ${colors.border};
          padding: 8px 6px;
          vertical-align: middle;
          text-align: center;
          word-wrap: break-word;
          font-size: 10px;
        }
        .product-table th {
          background: ${colors.tableHeaderBg};
          color: #ffffff;
          font-weight: 700;
        }
        .product-table th:nth-child(1),
        .product-table td:nth-child(1) { width: 16%; }
        .product-table th:nth-child(2),
        .product-table td:nth-child(2) { width: 18%; }
        .product-table th:nth-child(3),
        .product-table td:nth-child(3) { width: 56%; }
        .product-table th:nth-child(4),
        .product-table td:nth-child(4) { width: 10%; }

        .customer-separator {
          border: none;
          border-top: 2px dashed ${colors.separator};
          margin: 18px 0 4px;
          height: 0;
        }

        .grand-total-box {
          margin-top: 22px;
          padding: 14px 16px;
          border: 2px solid ${colors.navy};
          background: ${colors.customerTotalBoxBg};
          font-size: ${String(fonts.grandTotalPt + 2)}px;
          font-weight: 700;
          color: ${colors.navy};
          text-align: center;
        }

        .company-info {
          margin-top: 20px;
          text-align: center;
        }
        .company-info p {
          margin: 0 0 4px;
          font-size: 11px;
          color: ${colors.navy};
        }
      </style>

      <header class="report-header">
        <div class="report-header-row">
          <img class="logo-bera" src="${beraLogo}" alt="BERA" crossorigin="anonymous" />
          <h1 class="report-title">${escapeHtml(model.title)}</h1>
          <img class="logo-vileda" src="${viledaLogo}" alt="Vileda Professional" crossorigin="anonymous" />
        </div>
        <hr class="report-red-line" />
        <div class="report-meta">
          <p>${escapeHtml(model.dateText)}</p>
          <p>${escapeHtml(model.createdByText)}</p>
        </div>
      </header>

      ${customerSections}

      <div class="grand-total-box">
        ${escapeHtml(model.grandTotalLabel)}: ${String(model.grandTotalValue)}
      </div>

      <footer class="company-info">
        ${model.footerLines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}
      </footer>
    </div>
  `;
}

export function mountOrderReportTemplateHtml(html: string): HTMLElement {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.top = '0';
  host.style.left = '0';
  host.style.width = '794px';
  host.style.opacity = '0.01';
  host.style.pointerEvents = 'none';
  host.style.zIndex = '-1';
  host.style.background = '#ffffff';
  host.innerHTML = html;
  document.body.appendChild(host);

  const root = host.querySelector('.order-report-root');
  if (!(root instanceof HTMLElement)) {
    host.remove();
    throw new Error('Rapor şablonu oluşturulamadı.');
  }

  return root;
}
