import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { errMsg } from '../api/client';
import { formatRs, toPaisa, toRs } from '../lib/money';
import { todayStr, dateInput } from '../lib/format';
import { invalidateAll } from '../lib/invalidate';
import { Card, Field, Button, Notice, inputCls } from '../components/ui';

const emptyItem = { description: '', size: '', qty: 1, rate: '' };

export default function InvoiceForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState('');

  const { data: parties = [] } = useQuery({
    queryKey: ['parties', 'all'],
    queryFn: async () => (await api.get('/parties')).data,
  });
  const clients = parties.filter((p) => p.type === 'client');

  const { data: inv } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => (await api.get(`/invoices/${id}`)).data,
    enabled: editing,
  });

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { clientId: '', issueDate: todayStr(), dueDate: '', items: [{ ...emptyItem }], discount: '', notes: '' },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = useWatch({ control, name: 'items' }) || [];
  const discount = useWatch({ control, name: 'discount' });

  useEffect(() => {
    if (inv && parties.length) {
      reset({
        clientId: inv.clientId,
        issueDate: dateInput(inv.issueDate),
        dueDate: dateInput(inv.dueDate),
        items: inv.items.map((i) => ({ description: i.description, size: i.size, qty: i.qty, rate: toRs(i.rate) })),
        discount: inv.discount ? toRs(inv.discount) : '',
        notes: inv.notes,
      });
    }
  }, [inv, parties]);

  // server jaisa hi hisaab: amount = round(qty * rate_paisa)
  const lineAmount = (i) => Math.round((Number(i.qty) || 0) * toPaisa(i.rate));
  const subtotal = items.reduce((s, i) => s + lineAmount(i), 0);
  const total = subtotal - toPaisa(discount);

  const save = useMutation({
    mutationFn: (v) => {
      const body = {
        clientId: v.clientId,
        issueDate: v.issueDate,
        dueDate: v.dueDate || null,
        items: v.items.map((i) => ({
          description: i.description.trim(),
          size: i.size || '',
          qty: Number(i.qty),
          rate: toPaisa(i.rate),
        })),
        discount: toPaisa(v.discount),
        notes: v.notes || '',
      };
      return editing ? api.put(`/invoices/${id}`, body) : api.post('/invoices', body);
    },
    onSuccess: ({ data }) => {
      invalidateAll(qc);
      navigate(`/invoices/${data._id}`);
    },
    onError: (e) => setError(errMsg(e)),
  });

  const onSubmit = (v) => {
    setError('');
    if (total <= 0) return setError('Invoice total must be greater than 0');
    save.mutate(v);
  };

  if (editing && !inv) return <p className="text-gray-500">Loading...</p>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-3xl space-y-4">
      <Link to={editing ? `/invoices/${id}` : '/invoices'} className="text-sm text-navy hover:underline">&larr; Back</Link>
      <h1 className="text-2xl font-bold text-navy">{editing ? `Edit ${inv.number}` : 'New invoice'}</h1>
      {error && <Notice>{error}</Notice>}

      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <Field label="Client" error={errors.clientId && 'Select a client'}>
              <select className={inputCls} disabled={editing && inv.paidAmount > 0} {...register('clientId', { required: true })}>
                <option value="">Select client</option>
                {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </Field>
            {editing && inv.paidAmount > 0 && (
              <p className="mt-1 text-xs text-gray-500">Client cannot be changed because a payment is already recorded.</p>
            )}
          </div>
          <Field label="Issue date" error={errors.issueDate && 'Required'}>
            <input type="date" className={inputCls} {...register('issueDate', { required: true })} />
          </Field>
          <Field label="Due date (optional)">
            <input type="date" className={inputCls} {...register('dueDate')} />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-navy">Items</h2>
        <div className="space-y-3">
          {fields.map((f, idx) => (
            <div key={f.id} className="rounded-lg border border-gray-200 p-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-12">
                <div className="col-span-2 sm:col-span-5">
                  <label className="text-xs text-gray-500">Description (job / design)</label>
                  <input className={inputCls} {...register(`items.${idx}.description`, { required: true })} />
                  {errors.items?.[idx]?.description && <p className="mt-1 text-xs text-brand-magenta">Required</p>}
                </div>
                <div className="sm:col-span-3">
                  <label className="text-xs text-gray-500">Size / meters</label>
                  <input className={inputCls} {...register(`items.${idx}.size`)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-500">Qty</label>
                  <input type="number" step="any" min="0" className={inputCls} {...register(`items.${idx}.qty`, { required: true, validate: (v) => Number(v) > 0 })} />
                  {errors.items?.[idx]?.qty && <p className="mt-1 text-xs text-brand-magenta">Must be &gt; 0</p>}
                </div>
                <div className="col-span-2 sm:col-span-2">
                  <label className="text-xs text-gray-500">Rate (Rs)</label>
                  <input type="number" step="any" min="0" className={inputCls} {...register(`items.${idx}.rate`, { required: true })} />
                  {errors.items?.[idx]?.rate && <p className="mt-1 text-xs text-brand-magenta">Required</p>}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="font-semibold">Amount: {formatRs(lineAmount(items[idx] || {}))}</span>
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(idx)} className="text-brand-magenta hover:underline">Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" className="mt-3" onClick={() => append({ ...emptyItem })}>+ Add item</Button>
      </Card>

      <Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Discount (Rs, optional)">
            <input type="number" step="any" min="0" className={inputCls} {...register('discount')} />
          </Field>
          <Field label="Notes (optional)">
            <input className={inputCls} {...register('notes')} />
          </Field>
        </div>
        <div className="mt-4 space-y-1 border-t border-gray-100 pt-3 text-sm sm:ml-auto sm:max-w-xs">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatRs(subtotal)}</span></div>
          <div className="flex justify-between text-brand-magenta"><span>Discount</span><span>- {formatRs(toPaisa(discount))}</span></div>
          <div className="flex justify-between text-lg font-bold text-navy"><span>Total</span><span>{formatRs(total)}</span></div>
        </div>
      </Card>

      <Button type="submit" disabled={save.isPending} className="w-full sm:w-auto">
        {save.isPending ? 'Saving...' : editing ? 'Save changes' : 'Create invoice'}
      </Button>
    </form>
  );
}