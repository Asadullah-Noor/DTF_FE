import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { errMsg } from '../api/client';
import { formatRs, toPaisa, toRs } from '../lib/money';
import { formatDate, todayStr, dateInput } from '../lib/format';
import { invalidateAll } from '../lib/invalidate';
import { Card, Field, Button, Modal, Notice, inputCls } from '../components/ui';

const CATS = ['Electricity', 'Rent', 'Ink', 'Film', 'Powder', 'Other'];

function ExpenseForm({ expense, onDone }) {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: expense
      ? { date: dateInput(expense.date), category: expense.category, amount: toRs(expense.amount), notes: expense.notes }
      : { date: todayStr(), category: 'Electricity', amount: '', notes: '' },
  });

  const save = useMutation({
    mutationFn: (v) => {
      const body = { date: v.date, category: v.category, amount: toPaisa(v.amount), notes: v.notes || '' };
      return expense ? api.put(`/expenses/${expense._id}`, body) : api.post('/expenses', body);
    },
    onSuccess: () => { invalidateAll(qc); onDone(); },
    onError: (e) => setError(errMsg(e)),
  });

  return (
    <form onSubmit={handleSubmit((v) => { setError(''); save.mutate(v); })} className="space-y-3">
      {error && <Notice>{error}</Notice>}
      <Field label="Date" error={errors.date && 'Required'}>
        <input type="date" className={inputCls} {...register('date', { required: true })} />
      </Field>
      <Field label="Category">
        <select className={inputCls} {...register('category')}>
          {CATS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Amount (Rs)" error={errors.amount && 'Enter an amount greater than 0'}>
        <input type="number" step="any" min="0" className={inputCls} {...register('amount', { required: true, validate: (v) => Number(v) > 0 })} />
      </Field>
      <Field label="Notes (optional)"><input className={inputCls} {...register('notes')} /></Field>
      <Button type="submit" disabled={save.isPending} className="w-full">{save.isPending ? 'Saving...' : 'Save expense'}</Button>
    </form>
  );
}

export default function Expenses() {
  const qc = useQueryClient();
  const [f, setF] = useState({ category: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const setFilter = (k, v) => { setF((o) => ({ ...o, [k]: v })); setPage(1); };

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', f, page],
    queryFn: async () =>
      (await api.get('/expenses', { params: { category: f.category || undefined, from: f.from || undefined, to: f.to || undefined, page, limit: 50 } })).data,
  });
  const items = data?.items || [];

  const del = useMutation({
    mutationFn: (id) => api.delete(`/expenses/${id}`),
    onSuccess: () => invalidateAll(qc),
    onError: (e) => setError(errMsg(e)),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">Expenses</h1>
        <Button onClick={() => setEditing('new')}>+ Add expense</Button>
      </div>

      <Card>
        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <label className="text-xs text-gray-500">Category</label>
            <select className={inputCls} value={f.category} onChange={(e) => setFilter('category', e.target.value)}>
              <option value="">All categories</option>
              {CATS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">From</label>
            <input type="date" className={inputCls} value={f.from} onChange={(e) => setFilter('from', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500">To</label>
            <input type="date" className={inputCls} value={f.to} onChange={(e) => setFilter('to', e.target.value)} />
          </div>
        </div>
      </Card>

      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="border-t-4 !border-t-navy">
            <div className="text-xs text-gray-500">Total</div>
            <div className="text-xl font-bold text-navy">{formatRs(data.grandTotal)}</div>
          </Card>
          {Object.entries(data.byCategory).map(([c, v]) => (
            <Card key={c}>
              <div className="text-xs text-gray-500">{c}</div>
              <div className="text-lg font-semibold">{formatRs(v)}</div>
            </Card>
          ))}
        </div>
      )}

      {error && <Notice>{error}</Notice>}

      <Card className="overflow-x-auto !p-0">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan="5" className="p-6 text-center text-gray-500">Loading...</td></tr>}
            {!isLoading && items.length === 0 && <tr><td colSpan="5" className="p-6 text-center text-gray-500">No expenses found</td></tr>}
            {items.map((e) => (
              <tr key={e._id} className="border-t border-gray-100">
                <td className="whitespace-nowrap px-4 py-2.5">{formatDate(e.date)}</td>
                <td className="px-4 py-2.5 font-medium">{e.category}</td>
                <td className="px-4 py-2.5 text-gray-600">{e.notes}</td>
                <td className="px-4 py-2.5 text-right font-semibold">{formatRs(e.amount)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right">
                  <button onClick={() => setEditing(e)} className="mr-3 text-navy hover:underline">Edit</button>
                  <button onClick={() => { setError(''); if (confirm('Delete this expense?')) del.mutate(e._id); }} className="text-brand-magenta hover:underline">Delete</button>
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
        <Modal title={editing === 'new' ? 'Add expense' : 'Edit expense'} onClose={() => setEditing(null)}>
          <ExpenseForm expense={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  );
}