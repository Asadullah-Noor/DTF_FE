import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { errMsg } from '../api/client';
import { formatRs, toPaisa, toRs } from '../lib/money';
import { formatDate, todayStr, dateInput } from '../lib/format';
import { invalidateAll } from '../lib/invalidate';
import { Card, Field, Button, Modal, Notice, inputCls } from '../components/ui';

function PaymentForm({ payment, onDone }) {
  const qc = useQueryClient();
  const editing = !!payment;
  const [kind, setKind] = useState(payment?.kind || 'payment_in');
  const [error, setError] = useState('');
  const [alloc, setAlloc] = useState(() =>
    Object.fromEntries((payment?.allocations || []).map((a) => [a.invoiceId, String(toRs(a.amount))]))
  );

  const { data: parties = [] } = useQuery({
    queryKey: ['parties', 'all'],
    queryFn: async () => (await api.get('/parties')).data,
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: payment
      ? { partyId: payment.partyId, date: dateInput(payment.date), amount: toRs(payment.amount), notes: payment.notes }
      : { partyId: '', date: todayStr(), amount: '', notes: '' },
  });
  const partyId = watch('partyId');
  const amount = watch('amount');

  const { data: open = [] } = useQuery({
    queryKey: ['openInvoices', partyId],
    enabled: kind === 'payment_in' && !!partyId,
    queryFn: async () => (await api.get('/invoices', { params: { clientId: partyId, limit: 200 } })).data.items,
  });

  // edit mein is payment ki apni allocation wapas jama karke cap nikalte hain
  const own = Object.fromEntries((payment?.allocations || []).map((a) => [a.invoiceId, a.amount]));
  const rows = open
    .map((i) => ({ ...i, cap: i.remaining + (own[i._id] || 0) }))
    .filter((i) => i.cap > 0)
    .sort((a, b) => new Date(a.issueDate) - new Date(b.issueDate));

  const allocated = rows.reduce((s, r) => s + toPaisa(alloc[r._id]), 0);
  const total = toPaisa(amount);

  const autoAllocate = () => {
    let left = total;
    const next = {};
    for (const r of rows) {
      const give = Math.min(left, r.cap);
      next[r._id] = give > 0 ? String(toRs(give)) : '';
      left -= give;
    }
    setAlloc(next);
  };

  const save = useMutation({
    mutationFn: (body) => (editing ? api.put(`/payments/${payment._id}`, body) : api.post('/payments', body)),
    onSuccess: () => { invalidateAll(qc); onDone(); },
    onError: (e) => setError(errMsg(e)),
  });

  const onSubmit = (v) => {
    setError('');
    const allocations =
      kind === 'payment_in'
        ? rows.filter((r) => toPaisa(alloc[r._id]) > 0).map((r) => ({ invoiceId: r._id, amount: toPaisa(alloc[r._id]) }))
        : [];
    if (allocated > total) return setError('Allocated amount is more than the payment amount');
    if (rows.some((r) => toPaisa(alloc[r._id]) > r.cap)) return setError('One invoice amount is more than its remaining balance');
    save.mutate({
      partyId: editing ? payment.partyId : v.partyId,
      kind,
      date: v.date,
      amount: total,
      allocations,
      notes: v.notes || '',
    });
  };

  const pickKind = (k) => { setKind(k); setValue('partyId', ''); setAlloc({}); };
  const list = parties.filter((p) => p.type === (kind === 'payment_in' ? 'client' : 'supplier'));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      {error && <Notice>{error}</Notice>}

      {!editing && (
        <div className="grid grid-cols-2 gap-2">
          {[['payment_in', 'Received from client'], ['payment_out', 'Paid to supplier']].map(([k, label]) => (
            <button
              type="button" key={k} onClick={() => pickKind(k)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${kind === k ? 'border-navy bg-navy text-white' : 'border-gray-300 bg-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {editing ? (
        <p className="text-sm"><span className="text-gray-500">Party:</span> <b>{payment.party?.name}</b></p>
      ) : (
        <Field label={kind === 'payment_in' ? 'Client' : 'Supplier'} error={errors.partyId && 'Select a party'}>
          <select className={inputCls} {...register('partyId', { required: true })} onChange={(e) => { setValue('partyId', e.target.value); setAlloc({}); }}>
            <option value="">Select</option>
            {list.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </Field>
      )}

      <Field label="Date" error={errors.date && 'Required'}>
        <input type="date" className={inputCls} {...register('date', { required: true })} />
      </Field>
      <Field label="Amount (Rs)" error={errors.amount && 'Enter an amount greater than 0'}>
        <input type="number" step="any" min="0" className={inputCls} {...register('amount', { required: true, validate: (v) => Number(v) > 0 })} />
      </Field>

      {kind === 'payment_in' && partyId && (
        <div className="rounded-lg border border-gray-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Apply to invoices (optional)</span>
            {rows.length > 0 && total > 0 && (
              <button type="button" onClick={autoAllocate} className="text-xs text-navy underline">Auto (oldest first)</button>
            )}
          </div>
          {rows.length === 0 && <p className="text-xs text-gray-500">No unpaid invoices for this client. The amount will stay as advance.</p>}
          {rows.map((r) => (
            <div key={r._id} className="flex items-center justify-between gap-2 border-t border-gray-100 py-2 first:border-0">
              <div className="text-sm">
                <div className="font-medium">{r.number}</div>
                <div className="text-xs text-gray-500">Remaining {formatRs(r.cap)}</div>
              </div>
              <input
                type="number" step="any" min="0" placeholder="0" className={inputCls + ' !mt-0 w-28'}
                value={alloc[r._id] || ''} onChange={(e) => setAlloc({ ...alloc, [r._id]: e.target.value })}
              />
            </div>
          ))}
          {rows.length > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              Applied: {formatRs(allocated)} &bull; Advance (not applied): {formatRs(Math.max(total - allocated, 0))}
            </p>
          )}
        </div>
      )}

      <Field label="Notes (optional)"><input className={inputCls} {...register('notes')} /></Field>
      <Button type="submit" disabled={save.isPending} className="w-full">{save.isPending ? 'Saving...' : 'Save payment'}</Button>
    </form>
  );
}

const TABS = [['', 'All'], ['payment_in', 'Received'], ['payment_out', 'Paid to suppliers']];

export default function Payments() {
  const qc = useQueryClient();
  const [kind, setKind] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['payments', kind, page],
    queryFn: async () => (await api.get('/payments', { params: { kind: kind || undefined, page, limit: 50 } })).data,
  });
  const items = data?.items || [];

  const del = useMutation({
    mutationFn: (id) => api.delete(`/payments/${id}`),
    onSuccess: () => invalidateAll(qc),
    onError: (e) => setError(errMsg(e)),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">Payments</h1>
        <Button onClick={() => setEditing('new')}>+ Record payment</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(([v, label]) => (
          <button key={v} onClick={() => { setKind(v); setPage(1); }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${kind === v ? 'bg-navy text-white' : 'border border-gray-300 bg-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {error && <Notice>{error}</Notice>}

      <Card className="overflow-x-auto !p-0">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Party</th>
              <th className="px-4 py-3">Applied to</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan="5" className="p-6 text-center text-gray-500">Loading...</td></tr>}
            {!isLoading && items.length === 0 && <tr><td colSpan="5" className="p-6 text-center text-gray-500">No payments yet</td></tr>}
            {items.map((p) => (
              <tr key={p._id} className="border-t border-gray-100">
                <td className="whitespace-nowrap px-4 py-2.5">{formatDate(p.date)}</td>
                <td className="px-4 py-2.5">
                  <Link to={`/parties/${p.party?._id}`} className="font-medium text-navy hover:underline">{p.party?.name}</Link>
                  <div className="text-xs text-gray-500">{p.kind === 'payment_in' ? 'Received' : 'Paid'}{p.notes ? ` - ${p.notes}` : ''}</div>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-600">
                  {p.kind === 'payment_out' ? '-' : p.allocations.length ? p.allocations.map((a) => a.number).join(', ') : 'Advance / not linked'}
                </td>
                <td className={`px-4 py-2.5 text-right font-semibold ${p.kind === 'payment_in' ? 'text-green-600' : 'text-ink'}`}>{formatRs(p.amount)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right">
                  <button onClick={() => setEditing(p)} className="mr-3 text-navy hover:underline">Edit</button>
                  <button onClick={() => { setError(''); if (confirm('Delete this payment?')) del.mutate(p._id); }} className="text-brand-magenta hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span>Page {data.page} of {data.pages}</span>
          <Button variant="outline" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'Record payment' : 'Edit payment'} onClose={() => setEditing(null)}>
          <PaymentForm payment={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  );
}