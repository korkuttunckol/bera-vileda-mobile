import {
  ORDER_REPORT_FOOTER,
  ORDER_REPORT_LABELS,
} from './orderReport.constants';
import { ORDER_REPORT_TABLE_COLUMNS } from './orderReportLayout';
import { formatOrderReportDateTime } from './orderReportFormat';
import type { BulkOrderReport } from './orderReport.types';

export interface OrderReportTableRow {
  barcode: string;
  productSku: string;
  productName: string;
  quantity: number;
}

export interface OrderReportCustomerSection {
  sequenceNumber: number;
  customerCode: string;
  customerName: string;
  branchName: string;
  totalQuantity: number;
  tableHeaders: string[];
  tableRows: OrderReportTableRow[];
}

export interface OrderReportTemplateModel {
  title: string;
  dateText: string;
  createdByText: string;
  customers: OrderReportCustomerSection[];
  grandTotalLabel: string;
  grandTotalValue: number;
  footerLines: string[];
  tableHeaders: string[];
}

export function buildOrderReportTemplateModel(
  report: BulkOrderReport,
): OrderReportTemplateModel {
  const tableHeaders = ORDER_REPORT_TABLE_COLUMNS.map((column) => column.label);

  const customers: OrderReportCustomerSection[] = report.customers.map(
    (customer, index) => ({
      sequenceNumber: index + 1,
      customerCode: customer.customerCode,
      customerName: customer.customerName,
      branchName: customer.branchName,
      totalQuantity: customer.totalQuantity,
      tableHeaders,
      tableRows: customer.lines.map((line) => ({
        barcode: line.barcode || '-',
        productSku: line.productSku,
        productName: line.productName,
        quantity: line.quantity,
      })),
    }),
  );

  return {
    title: ORDER_REPORT_LABELS.title,
    dateText: `${ORDER_REPORT_LABELS.date}: ${formatOrderReportDateTime(report.reportDate)}`,
    createdByText: `${ORDER_REPORT_LABELS.createdBy}: ${report.createdByName}`,
    customers,
    grandTotalLabel: ORDER_REPORT_LABELS.grandTotal,
    grandTotalValue: report.grandTotalQuantity,
    footerLines: [
      ORDER_REPORT_FOOTER.company,
      ORDER_REPORT_FOOTER.contactName,
      ORDER_REPORT_FOOTER.phone,
      ORDER_REPORT_FOOTER.city,
    ],
    tableHeaders,
  };
}
