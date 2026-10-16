import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";
import { formatRs } from "../lib/money";
import { formatDate } from "../lib/format";
import { KIND_LABELS } from "../lib/kinds";
import { downloadFile } from "../lib/download";
import { Card, Button, Notice, inputCls } from "../components/ui";

// Positive = Dr (client aap ko dega), negative = Cr (aap ne supplier ko dena hai)
function Bal({ value }) {
  return (
    <span>
      {formatRs(Math.abs(value))}{" "}
      <span className="text-xs text-gray-400">
        {value > 0 ? "Dr" : value < 0 ? "Cr" : ""}
      </span>
    </span>
  );
}

export default function Statement() {
  const { id } = useParams();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dlError, setDlError] = useState("");

  const {
    data: st,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["statement", id, from, to],
    queryFn: async () =>
      (
        await api.get(`/parties/${id}/statement`, {
          params: { from: from || undefined, to: to || undefined },
        })
      ).data,
  });

  const downloadExcel = async () => {
    setDlError("");
    try {
      await downloadFile(
        `/parties/${id}/statement/excel`,
        { from: from || undefined, to: to || undefined },
        "statement.xlsx",
      );
    } catch {
      setDlError("Download failed. Please try again.");
    }
  };
  const downloadPdf = async () => {
    setDlError("");
    try {
      await downloadFile(
        `/parties/${id}/statement/pdf`,
        { from: from || undefined, to: to || undefined },
        "statement.pdf",
      );
    } catch {
      setDlError("Download failed. Please try again.");
    }
  };
  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (isError || !st) return <Notice>Could not load this party.</Notice>;

  const closing = st.closingBalance;
  const tone =
    closing > 0
      ? "text-green-600"
      : closing < 0
        ? "text-brand-magenta"
        : "text-gray-500";

  return (
    <div className="space-y-4">
      <Link to="/parties" className="text-sm text-navy hover:underline">
        &larr; Back to parties
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">{st.party.name}</h1>
          <p className="text-sm capitalize text-gray-500">
            {st.party.type}
            {st.party.phone && ` • ${st.party.phone}`}
          </p>
        </div>
        <Card className="sm:min-w-[14rem]">
          <div className="text-xs uppercase text-gray-500">Current balance</div>
          <div className={`text-2xl font-bold ${tone}`}>
            {formatRs(Math.abs(closing))}
          </div>
          <div className={`text-sm font-medium ${tone}`}>{st.closingLabel}</div>
        </Card>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div>
          <label className="text-xs text-gray-500">From</label>
          <input
            type="date"
            className={inputCls + " sm:w-44"}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">To</label>
          <input
            type="date"
            className={inputCls + " sm:w-44"}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        {(from || to) && (
          <Button
            variant="outline"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            Clear
          </Button>
        )}
        <div className="sm:ml-auto">
          <Button variant="outline" onClick={downloadExcel}>
            Download Excel
          </Button>
        </div>
      </div>
      {dlError && <Notice>{dlError}</Notice>}

      <Card className="overflow-x-auto !p-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Detail</th>
              <th className="px-4 py-3 text-right">Debit</th>
              <th className="px-4 py-3 text-right">Credit</th>
              <th className="px-4 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-100 bg-gray-50/60">
              <td className="px-4 py-2.5"></td>
              <td className="px-4 py-2.5 font-medium">Opening balance</td>
              <td></td>
              <td></td>
              <td className="px-4 py-2.5 text-right font-medium">
                <Bal value={st.openingBalance} />
              </td>
            </tr>
            {st.rows.length === 0 && (
              <tr>
                <td colSpan="5" className="p-6 text-center text-gray-500">
                  No entries in this period
                </td>
              </tr>
            )}
            {st.rows.map((r) => (
              <tr key={r._id} className="border-t border-gray-100">
                <td className="whitespace-nowrap px-4 py-2.5">
                  {formatDate(r.date)}
                </td>
                <td className="px-4 py-2.5">
                  <div>{KIND_LABELS[r.kind]}</div>
                  {(r.refNo || r.notes) && (
                    <div className="text-xs text-gray-500">
                      {[r.refNo, r.notes].filter(Boolean).join(" - ")}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {r.debit ? formatRs(r.debit) : ""}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {r.credit ? formatRs(r.credit) : ""}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Bal value={r.balance} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3">
                Total / Closing balance ({st.closingLabel})
              </td>
              <td className="px-4 py-3 text-right">
                {formatRs(st.totalDebit)}
              </td>
              <td className="px-4 py-3 text-right">
                {formatRs(st.totalCredit)}
              </td>
              <td className={`px-4 py-3 text-right ${tone}`}>
                <Bal value={closing} />
              </td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  );
}
