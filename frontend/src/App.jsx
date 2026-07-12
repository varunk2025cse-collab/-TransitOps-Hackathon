import { Routes, Route, Navigate } from 'react-router-dom';
import useStore from './store/useStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Dispatch from './pages/Dispatch';
import Trips from './pages/Trips';
import Maintenance from './pages/Maintenance';
import FuelLogs from './pages/FuelLogs';
import Expenses from './pages/Expenses';

function ProtectedRoute({ children }) {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="drivers" element={<Drivers />} />
        <Route path="dispatch" element={<Dispatch />} />
        <Route path="trips" element={<Trips />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="fuel-logs" element={<FuelLogs />} />
        <Route path="expenses" element={<Expenses />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
