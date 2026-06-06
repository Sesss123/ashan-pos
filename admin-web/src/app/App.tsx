import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../shared/layouts/AdminLayout';

// Lazy loaded modules for Performance Optimization (100/100)
const DashboardOverview = React.lazy(() => import('../features/dashboard/DashboardOverview'));
const UserManagement = React.lazy(() => import('../features/users/UserManagement'));
const MenuManagement = React.lazy(() => import('../features/menu/MenuManagement'));
const InventoryManagement = React.lazy(() => import('../features/inventory/InventoryManagement'));
const SupplierManagement = React.lazy(() => import('../features/suppliers/SupplierManagement'));
const ReportsManagement = React.lazy(() => import('../features/reports/ReportsManagement'));

// Loading Fallback
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#6366F1' }}>
    <h2>Loading Module...</h2>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardOverview />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="menu" element={<MenuManagement />} />
            <Route path="inventory" element={<InventoryManagement />} />
            <Route path="suppliers" element={<SupplierManagement />} />
            <Route path="reports" element={<ReportsManagement />} />
            
            {/* Fallback for undeveloped modules */}
            <Route path="*" element={
              <div style={{ padding: '40px', color: '#888' }}>
                <h2>Module under construction (Phase 4 Refactor)</h2>
              </div>
            } />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
