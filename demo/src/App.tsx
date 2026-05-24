import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import InsureLayout from './layouts/InsureLayout';
import Dashboard from './pages/Dashboard';
import Policies from './pages/Policies';
import Claims from './pages/Claims';
import LargeLoss from './pages/LargeLoss';
import Customers from './pages/Customers';
import Analytics from './pages/Analytics';
import Agents from './pages/Agents';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Support from './pages/Support';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<InsureLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="policies" element={<Policies />} />
          <Route path="claims" element={<Claims />} />
          <Route path="large-loss" element={<LargeLoss />} />
          <Route path="customers" element={<Customers />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="agents" element={<Agents />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="support" element={<Support />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
