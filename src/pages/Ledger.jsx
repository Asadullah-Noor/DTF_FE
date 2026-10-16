import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { errMsg } from "../api/client";
import { formatRs, toPaisa, toRs } from "../lib/money";
import { formatDate, todayStr, dateInput } from "../lib/format";
import { KIND_LABELS, KIND_SIDE, KINDS_FOR } from "../lib/kinds";
import { Card, Field, Button, Modal, Notice, inputCls } from "../components/ui";

function useAllParties() {
  return useQuery({
    queryKey: ["parties", "all"],
    queryFn: async () => (await api.get("/parties")).data,
  });
}

function EntryForm({ entry, parties, onDone }) {
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState(
    entry?.attachmentUrl || "",
  );
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: entry
      ? {
          date: dateInput(entry.date),
          partyId: entry.partyId,
          kind: entry.kind,
          amount: toRs(entry.debit || entry.credit),
          refNo: entry.refNo,
          notes: entry.notes,
        }
      : {
          date: todayStr(),
          partyId: "",
          kind: "",
          amount: "",
          refNo: "",
          notes: "",
        },
  });

  const partyId = watch("partyId");
  const kind = watch("kind");
  const party = parties.find((p) => p._id === partyId);
  const kindOptions = party ? KINDS_FOR[party.type] : [];

  // Party badalne par entry type us party ke hisab se set ho
  useEffect(() => {
    if (party && !kindOptions.includes(kind)) setValue("kind", kindOptions[0]);
  }, [partyId]);

  const onFile = async (file) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/transactions/upload", fd);
      setAttachmentUrl(data.url);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setUploading(false);
    }
  };

  const save = useMutation({
    mutationFn: (v) => {
      const amount = toPaisa(v.amount);
      const side = KIND_SIDE[v.kind];
      const body = {
        date: v.date,
        partyId: v.partyId,
        kind: v.kind,
        debit: side === "debit" ? amount : 0,
        credit: side === "credit" ? amount : 0,
        refNo: v.refNo || "",
        notes: v.notes || "",
        attachmentUrl,
      };
      return entry
        ? api.put(`/transactions/${entry._id}`, body)
        : api.post("/transactions", body);
    },
    onSuccess: () => {
      ["transactions", "parties", "statement"].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] }),
      );
      onDone();
    },
    onError: (e) => setError(errMsg(e)),
  });

  return (
    <form
      onSubmit={handleSubmit((v) => {
        setError("");
        save.mutate(v);
      })}
      className="space-y-3"
    >
      {error && <Notice>{error}</Notice>}

      <Field label="Date" error={errors.date && "Date is required"}>
        <input
          type="date"
          className={inputCls}
          {...register("date", { required: true })}
        />
      </Field>

      <Field label="Party" error={errors.partyId && "Select a party"}>
        <select
          className={inputCls}
          {...register("partyId", { required: true })}
        >
          <option value="">Select client or supplier</option>
          <optgroup label="Clients">
            {parties
              .filter((p) => p.type === "client")
              .map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
          </optgroup>
          <optgroup label="Suppliers">
            {parties
              .filter((p) => p.type === "supplier")
              .map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
          </optgroup>
        </select>
      </Field>

      <Field label="Entry type">
        <select
          className={inputCls}
          disabled={!party}
          {...register("kind", { required: true })}
        >
          {kindOptions.map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]} ({KIND_SIDE[k] === "debit" ? "Debit" : "Credit"})
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Amount (Rs)"
        error={errors.amount && "Enter an amount greater than 0"}
      >
        <input
          type="number"
          step="any"
          min="0"
          inputMode="decimal"
          className={inputCls}
          {...register("amount", {
            required: true,
            validate: (v) => Number(v) > 0,
          })}
        />
      </Field>

      <Field label="Reference no (optional)">
        <input className={inputCls} {...register("refNo")} />
      </Field>
      <Field label="Notes (optional)">
        <input className={inputCls} {...register("notes")} />
      </Field>

      <div>
        <label className="text-sm font-medium">Bill photo (optional)</label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          onChange={(e) => onFile(e.target.files[0])}
          className="mt-1 block text-sm"
        />
        {uploading && (
          <p className="mt-1 text-xs text-gray-500">Uploading...</p>
        )}
        {attachmentUrl && !uploading && (
          <p className="mt-1 text-xs">
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="text-navy underline"
            >
              View attached file
            </a>
            {" • "}
            <button
              type="button"
              onClick={() => setAttachmentUrl("")}
              className="text-brand-magenta"
            >
              Remove
            </button>
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={save.isPending || uploading}
        className="w-full"
      >
        {save.isPending ? "Saving..." : "Save entry"}
      </Button>
    </form>
  );
}

export default function Ledger() {
  const qc = useQueryClient();
  const { data: parties = [] } = useAllParties();
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    partyId: "",
    kind: "",
  });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // null | 'new' | entry
  const [error, setError] = useState("");

  const setFilter = (k, v) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", filters, page],
    queryFn: async () =>
      (
        await api.get("/transactions", {
          params: {
            from: filters.from || undefined,
            to: filters.to || undefined,
            partyId: filters.partyId || undefined,
            kind: filters.kind || undefined,
            page,
            limit: 50,
          },
        })
      ).data,
    keepPreviousData: true,
  });

  const del = useMutation({
    mutationFn: (id) => api.delete(`/transactions/${id}`),
    onSuccess: () =>
      ["transactions", "parties", "statement"].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] }),
      ),
    onError: (e) => setError(errMsg(e)),
  });

  const items = data?.items || [];
  const hasFilter = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">Debit Credit</h1>
        <Button onClick={() => setEditing("new")}>+ Add entry</Button>
      </div>

      <Card>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <div>
            <label className="text-xs text-gray-500">From</label>
            <input
              type="date"
              className={inputCls}
              value={filters.from}
              onChange={(e) => setFilter("from", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">To</label>
            <input
              type="date"
              className={inputCls}
              value={filters.to}
              onChange={(e) => setFilter("to", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Party</label>
            <select
              className={inputCls}
              value={filters.partyId}
              onChange={(e) => setFilter("partyId", e.target.value)}
            >
              <option value="">All parties</option>
              {parties.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Type</label>
            <select
              className={inputCls}
              value={filters.kind}
              onChange={(e) => setFilter("kind", e.target.value)}
            >
              <option value="">All types</option>
              {Object.entries(KIND_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {hasFilter && (
            <Button
              variant="outline"
              onClick={() => {
                setFilters({ from: "", to: "", partyId: "", kind: "" });
                setPage(1);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </Card>

      {error && <Notice>{error}</Notice>}

      <Card className="overflow-x-auto !p-0">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Party</th>
              <th className="px-4 py-3">Detail</th>
              <th className="px-4 py-3 text-right">Debit</th>
              <th className="px-4 py-3 text-right">Credit</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan="6" className="p-6 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan="6" className="p-6 text-center text-gray-500">
                  No entries found
                </td>
              </tr>
            )}
            {items.map((t) => (
              <tr key={t._id} className="border-t border-gray-100">
                <td className="whitespace-nowrap px-4 py-2.5">
                  {formatDate(t.date)}
                </td>
                <td className="px-4 py-2.5">
                  {t.party ? (
                    <Link
                      to={`/parties/${t.party._id}`}
                      className="font-medium text-navy hover:underline"
                    >
                      {t.party.name}
                    </Link>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div>{KIND_LABELS[t.kind]}</div>
                  {(t.refNo || t.notes) && (
                    <div className="text-xs text-gray-500">
                      {[t.refNo, t.notes].filter(Boolean).join(" - ")}
                    </div>
                  )}
                  {t.attachmentUrl && (
                    <a
                      href={t.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-brand-cyan hover:underline"
                    >
                      View bill
                    </a>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {t.debit ? formatRs(t.debit) : ""}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {t.credit ? formatRs(t.credit) : ""}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right">
                  {t.linked ? (
                    <span className="text-xs text-gray-400">Auto entry</span>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditing(t)}
                        className="mr-3 text-navy hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setError("");
                          if (confirm("Delete this entry?")) del.mutate(t._id);
                        }}
                        className="text-brand-magenta hover:underline"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {data && items.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                <td className="px-4 py-3" colSpan="3">
                  Total ({data.total} entries{hasFilter ? ", filtered" : ""})
                </td>
                <td className="px-4 py-3 text-right">
                  {formatRs(data.totals.debit)}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatRs(data.totals.credit)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </Card>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span>
            Page {data.page} of {data.pages}
          </span>
          <Button
            variant="outline"
            disabled={page >= data.pages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {editing && (
        <Modal
          title={editing === "new" ? "Add debit/credit entry" : "Edit entry"}
          onClose={() => setEditing(null)}
        >
          <EntryForm
            entry={editing === "new" ? null : editing}
            parties={parties}
            onDone={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  );
}
