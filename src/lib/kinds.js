export const KIND_LABELS = {
  invoice: "Invoice / Sale",
  payment_in: "Payment received",
  material_purchase: "Material purchase",
  payment_out: "Payment made",
  return: "Return of material",
  expense: "Expense",
};

// side = ledger mein kis taraf jayegi
export const KIND_SIDE = {
  invoice: "debit",
  payment_in: "credit",
  material_purchase: "credit",
  payment_out: "debit",
  return: "debit",
  expense: "debit",
};

// Party type ke hisab se kaun si entry types allowed hain
export const KINDS_FOR = {
  client: ["invoice", "payment_in"],
  supplier: ["material_purchase", "payment_out", "return"],
};
