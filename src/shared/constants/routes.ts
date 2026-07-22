export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  NEW_ORDER: '/orders/new',
  ORDER_HISTORY: '/orders',
  ORDER_DETAIL: '/orders/:id',
  CUSTOMERS: '/customers',
  CUSTOMER_NEW: '/customers/new',
  CUSTOMER_EDIT: '/customers/:id/edit',
  CUSTOMER_BRANCHES: '/customers/:id/branches',
  CUSTOMER_BRANCH_NEW: '/customers/:id/branches/new',
  CUSTOMER_BRANCH_EDIT: '/customers/:id/branches/:branchId/edit',
  PRODUCTS: '/products',
  PRODUCT_NEW: '/products/new',
  PRODUCT_EDIT: '/products/:id/edit',
  SETTINGS: '/settings',
  SETTINGS_IMPORT_PRODUCTS: '/settings/import/products',
  SETTINGS_IMPORT_CUSTOMERS: '/settings/import/customers',
  SETTINGS_IMPORT_REPORTS: '/settings/import/reports',
  SETTINGS_STOCK_UPDATE: '/settings/stock',
  SETTINGS_CLEAR_ORDERS: '/settings/clear-orders',
  SETTINGS_RESET_ALL_DATA: '/settings/reset-all-data',
  SETTINGS_DATA_MANAGEMENT: '/settings/data-management',
  SETTINGS_DEMO_DATA: '/settings/demo-data',
  SETTINGS_CUSTOMER_DISPLAY: '/settings/display/customers',
  SETTINGS_PRODUCT_DISPLAY: '/settings/display/products',
  SETTINGS_ORDER: '/settings/order',
  SETTINGS_APP_INFO: '/settings/app-info',
} as const;

export type BranchFormReturnTo = 'order';

export function buildCustomerBranchNewRoute(
  customerId: string,
  returnTo?: BranchFormReturnTo,
): string {
  const path = ROUTES.CUSTOMER_BRANCH_NEW.replace(':id', customerId);
  return returnTo ? `${path}?returnTo=${returnTo}` : path;
}

export type RouteKey = keyof typeof ROUTES;
