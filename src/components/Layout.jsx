import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/parties", label: "Parties" },
  { to: "/ledger", label: "Debit Credit" },
  { to: "/invoices", label: "Invoices" },
  { to: "/payments", label: "Payments" },
  { to: "/expenses", label: "Expenses" },
  { to: "/reports", label: "Reports" },
  { to: "/import-export", label: "Import / Export" }
];
export default function Layout() {
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItem = ({ isActive }) =>
    `block rounded-lg px-4 py-2.5 text-sm font-medium transition ${
      isActive ? "bg-navy text-white" : "text-ink hover:bg-gray-100"
    }`;

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 p-4">
        <Logo className="h-12" />
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
            className={navItem}
            onClick={() => setOpen(false)}
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-gray-200 p-3">
        <button
          onClick={handleLogout}
          className="w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-brand-magenta hover:bg-gray-100"
        >
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 lg:hidden">
        <Logo className="h-9" />
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white"
          aria-label="Open menu"
        >
          Menu
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
            {sidebar}
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
