import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Placeholder from './components/Placeholder';
import Settings from './pages/Settings';
import Parties from './pages/Parties';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/parties" replace />} />
          <Route path="/parties" element={<Parties />} />
          <Route path="/parties/:id" element={<Placeholder title="Party statement (next step)" />} />
          <Route path="/ledger" element={<Placeholder title="Ledger" />} />
          <Route path="/import-export" element={<Placeholder title="Import / Export" />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}