import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Settings from './pages/Settings';
import Parties from './pages/Parties';
import Statement from './pages/Statement';
import Ledger from './pages/Ledger';
import ImportExport from './pages/ImportExport';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/parties" replace />} />
          <Route path="/parties" element={<Parties />} />
          <Route path="/parties/:id" element={<Statement />} />
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/import-export" element={<ImportExport />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}