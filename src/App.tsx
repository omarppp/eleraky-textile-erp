import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './components/ui';
import { AccessDenied } from './components/PermissionGate';
import type { PermissionModule } from './types';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Designs } from './pages/Designs';
import { WorkOrders } from './pages/WorkOrders';
import { WeftWarehouse } from './pages/warehouses/WeftWarehouse';
import { WarpWarehouse } from './pages/warehouses/WarpWarehouse';
import { FinishedWarehouse } from './pages/warehouses/FinishedWarehouse';
import { ReusableWarehouse } from './pages/warehouses/ReusableWarehouse';
import { POYWarehouse } from './pages/warehouses/POYWarehouse';
import { Invoices } from './pages/Invoices';
import { Reports } from './pages/Reports';
import { Machines } from './pages/Machines';
import { Finance } from './pages/finance/Finance';
import { Journal } from './pages/finance/Journal';
import { Vouchers } from './pages/finance/Vouchers';
import { Cheques } from './pages/finance/Cheques';
import { Electronic } from './pages/finance/Electronic';
import { AccountStatement } from './pages/finance/AccountStatement';
import { Customers } from './pages/Customers';
import { Purchases } from './pages/Purchases';
import { Imports } from './pages/imports/Imports';
import { Users } from './pages/settings/Users';
import { AccessManagement } from './pages/settings/AccessManagement';
import { SystemSettingsPage } from './pages/settings/SystemSettings';
import { ActivityLogs } from './pages/settings/ActivityLogs';
import { DataSetup } from './pages/settings/DataSetup';
import { Employees } from './pages/employees/Employees';
import { FabricCosting } from './pages/costing/FabricCosting';
import { PrintInvoice } from './pages/invoices/PrintInvoice';

// =====================================================================
// ERROR BOUNDARY
// =====================================================================
interface EBState { hasError: boolean; message: string }

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, EBState> {
  state: EBState = { hasError: false, message: '' };

  static getDerivedStateFromError(err: unknown): EBState {
    const message = err instanceof Error ? err.message : String(err);
    return { hasError: true, message };
  }

  componentDidCatch(err: unknown, info: unknown) {
    console.error('[ErrorBoundary] خطأ غير متوقع:', err, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6" dir="rtl">
          <div className="bg-dark-card border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center shadow-card-lg">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">حدث خطأ غير متوقع</h2>
            <p className="text-gray-400 text-sm mb-4">يرجى تحديث الصفحة. إذا استمر الخطأ، راجع Console للتفاصيل.</p>
            {this.state.message && (
              <pre className="text-xs text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg p-3 text-right overflow-auto max-h-32 mb-4">
                {this.state.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-green text-white font-bold px-6 py-2.5 rounded-xl hover:bg-green-light transition-colors"
            >
              تحديث الصفحة
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// =====================================================================
// PROTECTED ROUTE
// =====================================================================
const Protected: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, error, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-brand animate-pulse">
            <img src="/logo.png" alt="" className="w-full h-full object-contain" />
          </div>
          <div className="w-8 h-8 rounded-full border-2 border-green/30 border-t-green animate-spin" />
          <p className="text-gray-500 text-sm">جارٍ التحقق من الجلسة...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (error) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6" dir="rtl">
        <div className="bg-dark-card border border-red-500/30 rounded-2xl p-8 max-w-sm w-full text-center shadow-card-lg">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🚫</span>
          </div>
          <h2 className="text-lg font-bold text-white mb-2">تعذّر الوصول</h2>
          <p className="text-red-400 text-sm mb-5">{error}</p>
          <button onClick={logout}
            className="bg-red-500/20 border border-red-500/30 text-red-400 font-bold px-6 py-2.5 rounded-xl hover:bg-red-500/30 transition-colors">
            العودة لتسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// =====================================================================
// ROUTE MODULE GUARD
// =====================================================================
const RequireModule: React.FC<{ module: PermissionModule; children: React.ReactNode }> = ({ module, children }) => {
  const { hasPermission } = useAuth();
  if (!hasPermission(module, 'view')) return <AccessDenied />;
  return <>{children}</>;
};

// =====================================================================
// ROUTES
// =====================================================================
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Standalone print page — no sidebar/navbar, own permission gate */}
      <Route path="/invoices/:id/print" element={<Protected><PrintInvoice /></Protected>} />

      <Route element={<Protected><Layout /></Protected>}>
        {/* Core */}
        <Route path="/"                        element={<Dashboard />} />
        <Route path="/designs"                 element={<Designs />} />
        <Route path="/work-orders"             element={<WorkOrders />} />

        {/* Warehouses */}
        <Route path="/warehouse/weft"          element={<WeftWarehouse />} />
        <Route path="/warehouse/warp"          element={<WarpWarehouse />} />
        <Route path="/warehouse/finished"      element={<FinishedWarehouse />} />
        <Route path="/warehouse/reusable"      element={<ReusableWarehouse />} />
        <Route path="/warehouse/poy"           element={<POYWarehouse />} />

        {/* Operations */}
        <Route path="/machines"                element={<Machines />} />
        <Route path="/invoices"                element={<RequireModule module="invoices"><Invoices /></RequireModule>} />
        <Route path="/customers"               element={<Customers />} />
        <Route path="/purchases"               element={<RequireModule module="purchases"><Purchases /></RequireModule>} />
        <Route path="/imports"                 element={<RequireModule module="import"><Imports /></RequireModule>} />

        {/* Finance */}
        <Route path="/finance"                 element={<RequireModule module="finance"><Finance /></RequireModule>} />
        <Route path="/finance/journal"         element={<RequireModule module="finance"><Journal /></RequireModule>} />
        <Route path="/finance/vouchers"        element={<RequireModule module="finance"><Vouchers /></RequireModule>} />
        <Route path="/finance/cheques"         element={<RequireModule module="finance"><Cheques /></RequireModule>} />
        <Route path="/finance/electronic"      element={<RequireModule module="finance"><Electronic /></RequireModule>} />
        <Route path="/finance/statement"       element={<RequireModule module="finance"><AccountStatement /></RequireModule>} />

        {/* Employees & Costing */}
        <Route path="/employees"               element={<Employees />} />
        <Route path="/costing/fabric"          element={<RequireModule module="fabricCosting"><FabricCosting /></RequireModule>} />

        {/* Reports */}
        <Route path="/reports"                 element={<RequireModule module="reports"><Reports /></RequireModule>} />

        {/* Settings */}
        <Route path="/settings"                element={<RequireModule module="settings"><SystemSettingsPage /></RequireModule>} />
        <Route path="/settings/users"          element={<RequireModule module="settings"><Users /></RequireModule>} />
        <Route path="/settings/access"         element={<RequireModule module="accessManagement"><AccessManagement /></RequireModule>} />
        <Route path="/settings/logs"           element={<RequireModule module="activityLogs"><ActivityLogs /></RequireModule>} />
        <Route path="/settings/data-setup"     element={<RequireModule module="dataSetup"><DataSetup /></RequireModule>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// =====================================================================
// ROOT APP
// =====================================================================
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <DataProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
