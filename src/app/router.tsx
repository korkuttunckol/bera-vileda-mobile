import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@/app/layouts/MainLayout';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { AdminRoute } from '@/features/auth/components/AdminRoute';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { DashboardPage } from '@/features/dashboard/components/DashboardPage';
import { NewOrderPage } from '@/features/orders/components/NewOrderPage';
import { OrderHistoryPage } from '@/features/orders/components/OrderHistoryPage';
import {
  CustomersPage,
  CustomerFormPage,
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
  UsersManagementPage,
} from '@/features/settings';
import { OrderDetailPage } from '@/features/orders/components/OrderDetailPage';
import { SendOrderPage } from '@/features/orders/components/SendOrderPage';
import { DiagnosticsPage } from '@/features/diagnostics';
import { ROUTES } from '@/shared/constants/routes';

export const router = createBrowserRouter([
  {
    path: '/diagnostics',
    element: <DiagnosticsPage />,
  },
  {
    path: ROUTES.LOGIN,
    element: <AuthLayout />,
    children: [{ index: true, element: <LoginForm /> }],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: ROUTES.DASHBOARD, element: <DashboardPage /> },
          { path: ROUTES.NEW_ORDER, element: <NewOrderPage /> },
          { path: ROUTES.ORDER_HISTORY, element: <OrderHistoryPage /> },
          { path: ROUTES.ORDER_DETAIL, element: <OrderDetailPage /> },
          { path: ROUTES.ORDER_SEND, element: <SendOrderPage /> },
          {
            path: ROUTES.CUSTOMERS,
            element: (
              <AdminRoute>
                <CustomersPage />
              </AdminRoute>
            ),
          },
          {
            path: ROUTES.CUSTOMER_NEW,
            element: (
              <AdminRoute>
                <CustomerFormPage />
              </AdminRoute>
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
              <AdminRoute>
                <ProductsPage />
              </AdminRoute>
            ),
          },
          {
            path: ROUTES.PRODUCT_NEW,
            element: (
              <AdminRoute>
                <ProductFormPage />
              </AdminRoute>
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
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to={ROUTES.DASHBOARD} replace /> },
]);
