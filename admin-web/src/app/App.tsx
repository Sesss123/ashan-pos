import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../shared/layouts/AdminLayout';
import { useAuthStore } from '../shared/store/authStore';

// Lazy loaded modules for Performance Optimization (100/100)
const DashboardOverview = React.lazy(() => import('../features/dashboard/DashboardOverview'));
const BranchesManagement = React.lazy(() => import('../features/branches/BranchesManagement'));
const UserManagement = React.lazy(() => import('../features/users/UserManagement'));
const RolesManagement = React.lazy(() => import('../features/roles/RolesManagement'));
const MenuManagement = React.lazy(() => import('../features/menu/MenuManagement'));
const InventoryManagement = React.lazy(() => import('../features/inventory/InventoryManagement'));
const SupplierManagement = React.lazy(() => import('../features/suppliers/SupplierManagement'));
const PurchasesManagement = React.lazy(() => import('../features/purchases/PurchasesManagement'));
const CustomersManagement = React.lazy(() => import('../features/customers/CustomersManagement'));
const ReportsManagement = React.lazy(() => import('../features/reports/ReportsManagement'));
const NotificationsCenter = React.lazy(() => import('../features/notifications/NotificationsCenter'));
const AuditLogs = React.lazy(() => import('../features/auditLogs/AuditLogsManagement'));
const SecurityCenter = React.lazy(() => import('../features/security/SecurityCenter'));
const BackupCenter = React.lazy(() => import('../features/backups/BackupCenter'));
const SettingsManagement = React.lazy(() => import('../features/settings/SettingsManagement'));
const LiveMonitors = React.lazy(() => import('../features/monitors/LiveMonitors'));
const AdvancedAnalytics = React.lazy(() => import('../features/analytics/AdvancedAnalytics'));
const LoginScreen = React.lazy(() => import('../features/auth/LoginScreen'));
const TablesManagement = React.lazy(() => import('../features/tables/TablesManagement'));

// Loading Fallback
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#6366F1' }}>
    <h2>Loading Module...</h2>
  </div>
);

// Protected Route Wrapper — production safe, no auto-login
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};


export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardOverview />} />
            <Route path="branches" element={<BranchesManagement />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="roles" element={<RolesManagement />} />
            <Route path="menu" element={<MenuManagement />} />
            <Route path="inventory" element={<InventoryManagement />} />
            <Route path="suppliers" element={<SupplierManagement />} />
            <Route path="purchases" element={<PurchasesManagement />} />
            <Route path="customers" element={<CustomersManagement />} />
            <Route path="reports" element={<ReportsManagement />} />
            <Route path="tables" element={<TablesManagement />} />
            
            {/* Enterprise Extras */}
            <Route path="monitors" element={<LiveMonitors />} />
            <Route path="analytics" element={<AdvancedAnalytics />} />
            
            <Route path="notifications" element={<NotificationsCenter />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="security" element={<SecurityCenter />} />
            <Route path="backups" element={<BackupCenter />} />
            <Route path="settings" element={<SettingsManagement />} />
            
            {/* Styled 404 Fallback */}
            <Route path="*" element={
              <div style={{ 
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                height: '70vh', gap: '16px', fontFamily: '"Plus Jakarta Sans", sans-serif'
              }}>
                <div style={{ fontSize: 64, fontWeight: 900, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>404</div>
                <h2 style={{ color: '#E2E8F0', margin: 0, fontWeight: 800 }}>Module Not Found</h2>
                <p style={{ color: '#64748B', margin: 0, fontWeight: 600 }}>This page doesn't exist or hasn't been deployed yet.</p>
                <a href="/dashboard" style={{ 
                  marginTop: 8, padding: '12px 28px', background: '#6366F1', color: '#fff', 
                  borderRadius: 12, fontWeight: 700, textDecoration: 'none', fontSize: 14,
                  boxShadow: '0 4px 14px rgba(99,102,241,0.4)', transition: 'all 0.2s'
                }}>← Back to Dashboard</a>
              </div>
            } />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
