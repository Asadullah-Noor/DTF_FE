// Koi bhi paisa wali tabdeeli ke baad saare related data refresh
export const invalidateAll = (qc) =>
  [
    "invoices",
    "invoice",
    "openInvoices",
    "payments",
    "expenses",
    "parties",
    "transactions",
    "statement",
    "dashboard",
    "reports",
  ].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
