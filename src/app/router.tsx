import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@/app/layouts/MainLayout';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { AdminRoute } from '@/features/auth/components/AdminRoute';
import { PermissionRoute } from '@/features/auth/components/PermissionRoute';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { AdminLoginForm } from '@/features/auth/components/AdminLoginForm';
import { DashboardPage } from '@/features/dashboard/components/DashboardPage';
import { NewOrderPage } from '@/features/orders/components/NewOrderPage';
import { OrderHistoryPage } from '@/features/orders/components/OrderHistoryPage';
import {
  CustomersPage,
  CustomerFormPage,
  CustomerActionsPage,
  CustomerInfoPage,
  CustomerStatementPage,
  CustomerInvoicePage,
  BranchListPage,
  BranchFormPage,
} from '@/features/customers';
import { ProductsPage } from '@/features/products/components/ProductsPage';
import { ProductFormPage } from '@/features/products/components/ProductFormPage';
import {
  SettingsPage,
  ImportProductsPage,
  ImportCustomersPage,
  StockUpdatePage,
  ImportReportsPage,
  ClearOrdersPage,
  AppInfoPage,
  CustomerDisplaySettingsPage,
  ProductDisplaySettingsPage,
  OrderSettingsPage,
  DataManagementPage,
  ResetAllDataPage,
  SyncSettingsPage,
  LocalDataFirestoreUploadPage,
  LogoCustomerSyncPage,
  LogoProductSyncPage,
  UsersManagementPage,
  UserFormPage,
} from '@/features/settings';
import { OrderDetailPage } from '@/features/orders/components/OrderDetailPage';
import { SendOrderPage } from '@/features/orders/components/SendOrderPage';
import { DiagnosticsPage } from '@/features/diagnostics';
import { NativeBarcodePocPage } from '@/features/nativeBarcodePoc';
import { UnitHubPage } from '@/features/units/components/UnitHubPage';
import { UnitPlaceholderPage } from '@/features/units/components/UnitPlaceholderPage';
import { DepotStockPage } from '@/features/units/components/DepotStockPage';
import { DepotCountPage } from '@/features/units/components/DepotCountPage';
import { DepotTasksPage } from '@/features/units/components/DepotTasksPage';
import { ROUTES } from '@/shared/constants/routes';

export const router = createBrowserRouter([
  {
    path: '/diagnostics',
    element: <DiagnosticsPage />,
  },
  {
    path: ROUTES.NATIVE_BARCODE_POC,
    element: <NativeBarcodePocPage />,
  },
  {
    path: ROUTES.LOGIN,
    element: <AuthLayout />,
    children: [{ index: true, element: <LoginForm /> }],
  },
  {
    path: ROUTES.ADMIN_LOGIN,
    element: <AuthLayout />,
    children: [{ index: true, element: <AdminLoginForm /> }],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: ROUTES.UNITS, element: <UnitHubPage /> },
          { path: ROUTES.DASHBOARD, element: <DashboardPage /> },
          { path: ROUTES.DEPOT, element: <DepotStockPage /> },
          { path: ROUTES.DEPOT_COUNT, element: <DepotCountPage /> },
          { path: ROUTES.DEPOT_TASKS, element: <DepotTasksPage /> },
          { path: ROUTES.PACKAGING, element: <UnitPlaceholderPage unit="packaging" /> },
          { path: ROUTES.REPORTING, element: <UnitPlaceholderPage unit="reporting" /> },
          { path: ROUTES.MANAGEMENT, element: <UnitPlaceholderPage unit="management" /> },
          { path: ROUTES.NEW_ORDER, element: <NewOrderPage /> },
          { path: ROUTES.ORDER_HISTORY, element: <OrderHistoryPage /> },
          { path: ROUTES.ORDER_DETAIL, element: <OrderDetailPage /> },
          { path: ROUTES.ORDER_SEND, element: <SendOrderPage /> },
          {
            path: ROUTES.CUSTOMERS,
            element: (
              <PermissionRoute permission="manageCustomers">
                <CustomersPage />
              </PermissionRoute>
            ),
          },
          {
            path: ROUTES.CUSTOMER_ACTIONS,
            element: (
              <PermissionRoute permission="manageCustomers">
                <CustomerActionsPage />
              </PermissionRoute>
            ),
          },
          {
            path: ROUTES.CUSTOMER_INFO,
            element: (
              <PermissionRoute permission="manageCustomers">
                <CustomerInfoPage />
              </PermissionRoute>
            ),
          },
          {
            path: ROUTES.CUSTOMER_STATEMENT,
            element: (
              <PermissionRoute permission="manageCustomers">
                <CustomerStatementPage />
              </PermissionRoute>
            ),
          },
          {
            path: ROUTES.CUSTOMER_INVOICE,
            element: (
              <PermissionRoute permission="manageCustomers">
                <CustomerInvoicePage />
              </PermissionRoute>
            ),
          },
          {
            path: ROUTES.CUSTOMER_EDIT,
            element: (
              <AdminRoute>
                <CustomerFormPage />
              </AdminRoute>
            ),
          },
          {
            path: ROUTES.CUSTOMER_BRANCHES,
            element: (
              <AdminRoute>
                <BranchListPage />
              </AdminRoute>
            ),
          },
          {
            path: ROUTES.CUSTOMER_BRANCH_NEW,
            element: (
              <AdminRoute>
                <BranchFormPage />
              </AdminRoute>
            ),
          },
          {
            path: ROUTES.CUSTOMER_BRANCH_EDIT,
            element: (
              <AdminRoute>
                <BranchFormPage />
              </AdminRoute>
            ),
          },
          {
            path: ROUTES.PRODUCTS,
            element: (
              <PermissionRoute permission="manageProducts">
                <ProductsPage />
              </PermissionRoute>
            ),
          },
          {
            path: ROUTES.PRODUCT_EDIT,
            element: (
              <AdminRoute>
                <ProductFormPage />
              </AdminRoute>
            ),
          },
          {
            path: ROUTES.SETTINGS,
            element: (
              <AdminRoute>
                <SettingsPage />
              </AdminRoute>
            ),
          },
          {
            path: ROUTES.SETTINGS_SYNC,
            element: (
              <AdminRoute>
                <SyncSettingsPage />
              </AdminRoute>
            ),
          },
          {
            path: ROUTES.SETTINGS_UPLOAD_LOCAL_FIRESTORE,
            element: (
              <AdminRoute>
                <LocalDataFirestoreUploadPage />
              </AdminRoute>
            ),
          },
          {
            path: ROUTES.SETTINGS_LOGO_CUSTOMERS,
            element: (
              <AdminRoute>
                <LogoCustomerSyncPage />
              </AdminRoute>
            ),
          },
          {
            path: ROUTES.SETTINGS_LOGO_PRODUCTS,
            element: (
              <AdminRoute>
                <LogoProductSyncPage />
              </AdminRoute>
            ),
          },
          {
            path: ROUTES.SETTINGS_IMPORT_PRODUCTS,
            element: (
              <AdminRoute>
                <ImportProductsPage />
              </AdminRoute>
            ),
          },
          {
            path: ROUTES.SETTINGS_IMPORT_CUSTOMERS,
            element: (
              <AdminRoute>
                <ImportCustomersPage />
              </AdminRoute>
            ),
          },
          {
            path: ROUTES.SETTINGS_STOCK_UPDATE,
            element: (
              <AdminRoute>
                <StockUpdatePage />
              </AdminRoute>
            ),
          },
          {
            path: ROUTES.SETTINGS_IMPORT_REPORTS,
            element: (
              <AdminRoute>
                <ImportReportsPage />
              </AdminRoute>
            ),
          },
          {
            path: ROUTES.SETTINGS_CLEAR_ORDERS,
            element: (
              <AdminRoute>
                <ClearOrdersPage />
              </AdminRoute>
            ),
          },
          {
            path: ROUTES.SETTINGS_DATA_MANAGEMENT,
            element: (
              <AdminRoute>
                <DataManagementPage />
              </AdminRoute>
            ),
          },
          {
            path: ROUTES.SETTINGS_RESET_ALL_DATA,
            element: (
              <AdminRoute>
                <ResetAllDataPage />
              </AdminRoute>
            ),
          },
          {
            path: ROUTES.SETTINGS_CUSTOMER_DISPLAY,
            element: (
              <AdminRoute>
                <CustomerDisplaySettingsPage />
              </AdminRoute>
            ),
          },
          {
            path: ROUTES.SETTINGS_PRODUCT_DISPLAY,
            element: (
              <AdminRoute>
                <ProductDisplaySettingsPage />
              </AdminRoute>
            ),
          },
          {
            path: ROUTES.SETTINGS_ORDER,
            element: (
              <AdminRoute>
                <OrderSettingsPage />
              </AdminRoute>
            ),
          },
          {
            path: ROUTES.SETTINGS_APP_INFO,
            element: <AppInfoPage />,
          },
          {
            path: ROUTES.SETTINGS_USERS,
            element: (
              <AdminRoute>
                <UsersManagementPage />
              </AdminRoute>
            ),
          },
          {
            path: ROUTES.SETTINGS_USER_NEW,
            element: (
              <AdminRoute>
                <UserFormPage />
              </AdminRoute>
            ),
          },
          {
            path: ROUTES.SETTINGS_USER_EDIT,
            element: (
              <AdminRoute>
                <UserFormPage />
              </AdminRoute>
            ),
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to={ROUTES.DASHBOARD} replace /> },
]);
