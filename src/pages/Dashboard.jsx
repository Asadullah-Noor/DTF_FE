import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";
import { formatRs } from "../lib/money";
import { formatDate } from "../lib/format";
import { KIND_LABELS } from "../lib/kinds";
import { Card, Notice } from "../components/ui";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

function Stat({ border, label, value, sub }) {
  return (
    <div
      className={`rounded-xl border border-gray-200 border-t-4 bg-white p-4 sm:p-5 ${border}`}
    >
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-navy sm:text-3xl">
        {value}
      </div>
      <div className="mt-2 text-xs text-gray-500">{sub}</div>
    </div>
  );
}

function Chart({ series }) {
  const max = Math.max(1, ...series.flatMap((s) => [s.sales, s.expenses]));
  const h = (v) => (v > 0 ? Math.max((v / max) * 100, 2) : 0);
  return (
    <div>
      <div className="flex gap-2 sm:gap-4">
        {series.map((s) => (
          <div key={s.key} className="flex flex-1 flex-col items-center">
            <div className="flex h-44 w-full items-end justify-center gap-1">
              <div
                title={`Sales ${formatRs(s.sales)}`}
                className="w-1/2 max-w-[28px] rounded-t bg-navy"
                style={{ height: `${h(s.sales)}%` }}
              />
              <div
                title={`Expenses ${formatRs(s.expenses)}`}
                className="w-1/2 max-w-[28px] rounded-t bg-brand-cyan"
                style={{ height: `${h(s.expenses)}%` }}
              />
            </div>
            <span className="mt-1 text-xs text-gray-500">{s.month}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 rounded-sm bg-navy" /> Sales
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 rounded-sm bg-brand-cyan" />{" "}
          Expenses
        </span>
      </div>
    </div>
  );
}

const actions = [
  ["+ Add debit/credit entry", "/ledger"],
  ["Record payment", "/payments"],
  ["Add expense", "/expenses"],
  ["View reports", "/reports"],
];

export default function Dashboard() {
  const {
    data: d,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get("/reports/dashboard")).data,
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (isError || !d) return <Notice>Could not load dashboard.</Notice>;

  const g = d.salesGrowthPercent;
  const growth =
    g == null
      ? "No sales last month"
      : `${g >= 0 ? "+" : ""}${g}% from last month`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy sm:text-3xl">
            {greeting()}, Waqas
          </h1>
          <p className="text-sm text-gray-500">
            Here's how your business is doing today.
          </p>
        </div>
        <Link
          to="/invoices/new"
          className="rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-dark"
        >
          + Create invoice
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          border="border-t-brand-cyan"
          label="Sales this month"
          value={formatRs(d.salesThisMonth)}
          sub={growth}
        />
        <Stat
          border="border-t-brand-magenta"
          label="Receivable (You will receive)"
          value={formatRs(d.totalReceivable)}
          sub={`Across ${d.receivableClients} clients`}
        />
        <Stat
          border="border-t-brand-yellow"
          label="Payable (You will pay)"
          value={formatRs(d.totalPayable)}
          sub={`Across ${d.payableSuppliers} suppliers`}
        />
        <Stat
          border="border-t-navy"
          label="Pending invoices"
          value={d.pendingInvoices}
          sub={`${formatRs(d.pendingOutstanding)} outstanding`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="font-semibold text-navy">Sales &amp; expenses</h2>
          <p className="mb-4 text-xs text-gray-500">Last 6 months</p>
          <Chart series={d.series} />
        </Card>

        <Card>
          <h2 className="font-semibold text-navy">Quick actions</h2>
          <p className="mb-3 text-xs text-gray-500">Common tasks</p>
          <div className="space-y-2">
            {actions.map(([label, to]) => (
              <Link
                key={to}
                to={to}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-3 text-sm font-medium hover:bg-gray-50"
              >
                {label} <span className="text-gray-400">&rsaquo;</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <Card className="!p-0 overflow-x-auto">
        <h2 className="p-4 pb-2 font-semibold text-navy">Recent entries</h2>
        <table className="w-full min-w-[560px] text-sm">
          <tbody>
            {d.recent.length === 0 && (
              <tr>
                <td className="p-6 text-center text-gray-500">
                  No entries yet
                </td>
              </tr>
            )}
            {d.recent.map((r) => (
              <tr key={r._id} className="border-t border-gray-100">
                <td className="whitespace-nowrap px-4 py-2.5">
                  {formatDate(r.date)}
                </td>
                <td className="px-4 py-2.5">
                  <div className="font-medium">{r.party || "Expense"}</div>
                  <div className="text-xs text-gray-500">
                    {KIND_LABELS[r.kind]}
                    {r.refNo ? ` - ${r.refNo}` : ""}
                  </div>
                </td>
                <td
                  className={`px-4 py-2.5 text-right font-semibold ${r.debit ? "text-ink" : "text-green-600"}`}
                >
                  {r.debit
                    ? `Dr ${formatRs(r.debit)}`
                    : `Cr ${formatRs(r.credit)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
