import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@/app/layouts/MainLayout';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
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
} from '@/features/settings';
import { OrderDetailPage } from '@/features/orders/components/OrderDetailPage';
import { SendOrderPage } from '@/features/orders/components/SendOrderPage';
import { ROUTES } from '@/shared/constants/routes';

export const router = createBrowserRouter([
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
          { path: ROUTES.CUSTOMERS, element: <CustomersPage /> },
          { path: ROUTES.CUSTOMER_NEW, element: <CustomerFormPage /> },
          { path: ROUTES.CUSTOMER_EDIT, element: <CustomerFormPage /> },
          { path: ROUTES.CUSTOMER_BRANCHES, element: <BranchListPage /> },
          { path: ROUTES.CUSTOMER_BRANCH_NEW, element: <BranchFormPage /> },
          { path: ROUTES.CUSTOMER_BRANCH_EDIT, element: <BranchFormPage /> },
          { path: ROUTES.PRODUCTS, element: <ProductsPage /> },
          { path: ROUTES.PRODUCT_NEW, element: <ProductFormPage /> },
          { path: ROUTES.PRODUCT_EDIT, element: <ProductFormPage /> },
          { path: ROUTES.SETTINGS, element: <SettingsPage /> },
          { path: ROUTES.SETTINGS_SYNC, element: <SyncSettingsPage /> },
          {
            path: ROUTES.SETTINGS_IMPORT_PRODUCTS,
            element: <ImportProductsPage />,
          },
          {
            path: ROUTES.SETTINGS_IMPORT_CUSTOMERS,
            element: <ImportCustomersPage />,
          },
          {
            path: ROUTES.SETTINGS_STOCK_UPDATE,
            element: <StockUpdatePage />,
          },
          {
            path: ROUTES.SETTINGS_IMPORT_REPORTS,
            element: <ImportReportsPage />,
          },
          {
            path: ROUTES.SETTINGS_CLEAR_ORDERS,
            element: <ClearOrdersPage />,
          },
          {
            path: ROUTES.SETTINGS_DATA_MANAGEMENT,
            element: <DataManagementPage />,
          },
          {
            path: ROUTES.SETTINGS_RESET_ALL_DATA,
            element: <ResetAllDataPage />,
          },
          {
            path: ROUTES.SETTINGS_CUSTOMER_DISPLAY,
            element: <CustomerDisplaySettingsPage />,
          },
          {
            path: ROUTES.SETTINGS_PRODUCT_DISPLAY,
            element: <ProductDisplaySettingsPage />,
          },
          {
            path: ROUTES.SETTINGS_ORDER,
            element: <OrderSettingsPage />,
          },
          {
            path: ROUTES.SETTINGS_APP_INFO,
            element: <AppInfoPage />,
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to={ROUTES.DASHBOARD} replace /> },
]);
