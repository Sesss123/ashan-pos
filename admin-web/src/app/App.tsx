import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './shared/layouts/AdminLayout';
import DashboardOverview from './features/dashboard/DashboardOverview';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        
        {/* Protected Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<DashboardOverview />} />
          {/* Future Routes */}
          <Route path="users" element={<div>User Management Placeholder</div>} />
          <Route path="menu" element={<div>Menu Management Placeholder</div>} />
          <Route path="inventory" element={<div>Inventory Placeholder</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
