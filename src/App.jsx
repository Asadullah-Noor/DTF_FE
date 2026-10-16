import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Parties from "./pages/Parties";
import Statement from "./pages/Statement";
import Ledger from "./pages/Ledger";
import Invoices from "./pages/Invoices";
import InvoiceForm from "./pages/InvoiceForm";
import InvoiceDetail from "./pages/InvoiceDetail";
import Payments from "./pages/Payments";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import ImportExport from "./pages/ImportExport";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/parties" element={<Parties />} />
          <Route path="/parties/:id" element={<Statement />} />
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/new" element={<InvoiceForm />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/invoices/:id/edit" element={<InvoiceForm />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/import-export" element={<ImportExport />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
