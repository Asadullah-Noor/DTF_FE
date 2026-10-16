import { forwardRef } from "react";
import { formatRs } from "../lib/money";
import { formatDate } from "../lib/format";
import { amountInWords } from "../lib/amountInWords";
import { BUSINESS } from "../config/business";

const STATUS = {
  pending: ["PENDING", "#E6287E", "#fff"],
  partial_paid: ["PARTIAL PAID", "#F5C518", "#1F2933"],
  paid: ["PAID", "#16A34A", "#fff"],
};

const InvoiceReceipt = forwardRef(function InvoiceReceipt({ inv }, ref) {
  const [label, bg, fg] = STATUS[inv.status] || STATUS.pending;
  const navy = "#0B3A6B";
  const grey = "#6B7280";

  return (
    <div
      ref={ref}
      style={{
        width: 640,
        background: "#fff",
        padding: 32,
        color: "#1F2933",
        fontFamily: "system-ui, Arial, sans-serif",
        fontSize: 13,
      }}
    >
      {/* Header: business details left, LOGO top right */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: navy }}>
            {BUSINESS.name}
          </div>
          {BUSINESS.address && (
            <div style={{ color: grey, marginTop: 4, maxWidth: 300 }}>
              {BUSINESS.address}
            </div>
          )}
          {BUSINESS.phone && (
            <div style={{ color: grey, marginTop: 2 }}>
              Phone: {BUSINESS.phone}
            </div>
          )}
        </div>
        <img
          src="/logo.png"
          alt={BUSINESS.name}
          style={{
            height: 64,
            width: "auto",
            maxWidth: 220,
            objectFit: "contain",
          }}
        />
      </div>
      <div style={{ height: 3, background: navy, margin: "14px 0 4px" }} />
      <div style={{ display: "flex", height: 4 }}>
        <i style={{ width: 40, background: "#00A8F0" }} />
        <i style={{ width: 40, background: "#E6287E" }} />
        <i style={{ width: 40, background: "#F5C518" }} />
      </div>

      {/* Title + status */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          margin: "18px 0 12px",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700, color: navy }}>
          RECEIPT / INVOICE
        </div>
        <div
          style={{
            background: bg,
            color: fg,
            padding: "5px 14px",
            borderRadius: 999,
            fontWeight: 700,
            fontSize: 11,
          }}
        >
          {label}
        </div>
      </div>

      {/* Bill to + invoice info */}
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 16 }}
      >
        <div>
          <div style={{ fontSize: 10, color: grey, fontWeight: 700 }}>
            BILL TO
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
            {inv.client?.name}
          </div>
          {inv.client?.phone && (
            <div style={{ color: grey }}>{inv.client.phone}</div>
          )}
          {inv.client?.address && (
            <div style={{ color: grey }}>{inv.client.address}</div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div>
            <span style={{ color: grey }}>Invoice No: </span>
            <b>{inv.number}</b>
          </div>
          <div>
            <span style={{ color: grey }}>Date: </span>
            <b>{formatDate(inv.issueDate)}</b>
          </div>
          {inv.dueDate && (
            <div>
              <span style={{ color: grey }}>Due: </span>
              <b>{formatDate(inv.dueDate)}</b>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <table
        style={{ width: "100%", borderCollapse: "collapse", marginTop: 18 }}
      >
        <thead>
          <tr style={{ background: navy, color: "#fff", textAlign: "left" }}>
            <th style={{ padding: "8px 10px" }}>Description</th>
            <th style={{ padding: "8px 10px" }}>Size</th>
            <th style={{ padding: "8px 10px", textAlign: "right" }}>Qty</th>
            <th style={{ padding: "8px 10px", textAlign: "right" }}>Rate</th>
            <th style={{ padding: "8px 10px", textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {inv.items.map((i, n) => (
            <tr key={n} style={{ borderBottom: "1px solid #E5E7EB" }}>
              <td style={{ padding: "8px 10px" }}>{i.description}</td>
              <td style={{ padding: "8px 10px" }}>{i.size || "-"}</td>
              <td style={{ padding: "8px 10px", textAlign: "right" }}>
                {i.qty}
              </td>
              <td style={{ padding: "8px 10px", textAlign: "right" }}>
                {formatRs(i.rate)}
              </td>
              <td style={{ padding: "8px 10px", textAlign: "right" }}>
                {formatRs(i.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ marginLeft: "auto", width: 260, marginTop: 14 }}>
        <Row k="Subtotal" v={formatRs(inv.subtotal)} />
        {inv.discount > 0 && (
          <Row k="Discount" v={"- " + formatRs(inv.discount)} color="#E6287E" />
        )}
        <div style={{ borderTop: `2px solid ${navy}`, margin: "6px 0" }} />
        <Row k="Total" v={formatRs(inv.total)} bold big color={navy} />
        <Row k="Received" v={formatRs(inv.paidAmount)} color="#16A34A" />
        <Row
          k="Remaining"
          v={formatRs(inv.remaining)}
          bold
          color={inv.remaining > 0 ? "#E6287E" : "#16A34A"}
        />
      </div>

      <div
        style={{
          background: "#F5F7FA",
          borderRadius: 6,
          padding: "10px 12px",
          marginTop: 16,
        }}
      >
        <div style={{ fontSize: 10, color: grey, fontWeight: 700 }}>
          AMOUNT IN WORDS (TOTAL)
        </div>
        <div style={{ marginTop: 2 }}>{amountInWords(inv.total)}</div>
      </div>

      {inv.notes && (
        <div style={{ marginTop: 12, color: grey }}>Notes: {inv.notes}</div>
      )}
      <div
        style={{
          textAlign: "center",
          color: grey,
          fontSize: 11,
          marginTop: 20,
        }}
      >
        Thank you for your business.
      </div>
    </div>
  );
});

function Row({ k, v, bold, big, color }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "3px 0",
        fontWeight: bold ? 700 : 400,
        fontSize: big ? 16 : 13,
        color: color || "#1F2933",
      }}
    >
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}

export default InvoiceReceipt;
