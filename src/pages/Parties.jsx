import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { errMsg } from "../api/client";
import { formatRs, toPaisa, toRs } from "../lib/money";
import { Card, Field, Button, Modal, Notice, inputCls } from "../components/ui";

function PartyForm({ party, onDone }) {
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const { register, handleSubmit } = useForm({
    defaultValues: party
      ? { ...party, openingBalance: toRs(party.openingBalance) }
      : { type: "client", openingBalance: 0 },
  });

  const save = useMutation({
    mutationFn: (v) => {
      const body = {
        name: v.name,
        type: v.type,
        phone: v.phone || "",
        address: v.address || "",
        notes: v.notes || "",
        openingBalance: toPaisa(v.openingBalance),
      };
      return party
        ? api.put(`/parties/${party._id}`, body)
        : api.post("/parties", body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parties"] });
      onDone();
    },
    onError: (e) => setError(errMsg(e)),
  });

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-3">
      {error && <Notice>{error}</Notice>}
      <Field label="Name">
        <input className={inputCls} {...register("name", { required: true })} />
      </Field>
      <Field label="Type">
        <select className={inputCls} {...register("type")}>
          <option value="client">Client</option>
          <option value="supplier">Supplier</option>
        </select>
      </Field>
      <Field label="Phone">
        <input className={inputCls} {...register("phone")} />
      </Field>
      <Field label="Address">
        <input className={inputCls} {...register("address")} />
      </Field>
      <Field label="Opening balance (Rs, optional)">
        <input
          type="number"
          step="any"
          className={inputCls}
          {...register("openingBalance")}
        />
        <p className="mt-1 text-xs text-gray-500">
          Client: positive = they owe you. Supplier: negative = you owe them.
        </p>
      </Field>
      <Field label="Notes">
        <input className={inputCls} {...register("notes")} />
      </Field>
      <Button type="submit" disabled={save.isPending} className="w-full">
        Save
      </Button>
    </form>
  );
}

export default function Parties() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [editing, setEditing] = useState(null); // null | 'new' | party

  const { data: parties = [], isLoading } = useQuery({
    queryKey: ["parties", search, type],
    queryFn: async () =>
      (
        await api.get("/parties", {
          params: { search: search || undefined, type: type || undefined },
        })
      ).data,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">Parties</h1>
        <Button onClick={() => setEditing("new")}>+ Add party</Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className={inputCls + " sm:max-w-xs"}
          placeholder="Search name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={inputCls + " sm:max-w-[10rem]"}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">All types</option>
          <option value="client">Clients</option>
          <option value="supplier">Suppliers</option>
        </select>
      </div>

      <Card className="overflow-x-auto !p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan="4" className="p-6 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            )}
            {!isLoading && parties.length === 0 && (
              <tr>
                <td colSpan="4" className="p-6 text-center text-gray-500">
                  No parties found
                </td>
              </tr>
            )}
            {parties.map((p) => (
              <tr key={p._id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium">
                  <Link
                    to={`/parties/${p._id}`}
                    className="text-navy hover:underline"
                  >
                    {p.name}
                  </Link>
                  {p.phone && (
                    <div className="text-xs text-gray-500">{p.phone}</div>
                  )}
                </td>
                <td className="px-4 py-3 capitalize">{p.type}</td>
                <td className="px-4 py-3 text-right">
                  <div className="font-semibold">
                    {formatRs(Math.abs(p.balance))}
                  </div>
                  <div
                    className={`text-xs ${p.balance > 0 ? "text-green-600" : p.balance < 0 ? "text-brand-magenta" : "text-gray-400"}`}
                  >
                    {p.balanceLabel}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <Link
                    to={`/parties/${p._id}`}
                    className="mr-3 text-sm font-medium text-navy hover:underline"
                  >
                    Statement
                  </Link>
                  <button
                    onClick={() => setEditing(p)}
                    className="text-sm text-gray-600 hover:underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {editing && (
        <Modal
          title={editing === "new" ? "Add party" : "Edit party"}
          onClose={() => setEditing(null)}
        >
          <PartyForm
            party={editing === "new" ? null : editing}
            onDone={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  );
}
