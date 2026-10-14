import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toPng } from 'html-to-image';
import api, { errMsg } from '../api/client';
import { formatRs, toPaisa, toRs } from '../lib/money';
import { formatDate, todayStr } from '../lib/format';
import { invalidateAll } from '../lib/invalidate';
import StatusBadge from '../components/StatusBadge';
import InvoiceReceipt from '../components/InvoiceReceipt';
import { Card, Field, Button, Modal, Notice, inputCls } from '../components/ui';

function PayForm({ inv, onDone }) {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { date: todayStr(), amount: toRs(inv.remaining), notes: '' },
  });

  const pay = useMutation({
    mutationFn: (v) => api.post(`/invoices/${inv._id}/payments`, { date: v.date, amount: toPaisa(v.amount), notes: v.notes || '' }),
    onSuccess: () => { invalidateAll(qc); onDone(); },
    onError: (e) => setError(errMsg(e)),
  });

  const onSubmit = (v) => {
    setError('');
    if (toPaisa(v.amount) > inv.remaining) return setError('Amount is more than the remaining balance');
    pay.mutate(v);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      {error && <Notice>{error}</Notice>}
      <p className="text-sm text-gray-500">Remaining: <b>{formatRs(inv.remaining)}</b></p>
      <Field label="Date" error={errors.date && 'Required'}>
        <input type="date" className={inputCls} {...register('date', { required: true })} />
      </Field>
      <Field label="Amount received (Rs)" error={errors.amount && 'Enter an amount greater than 0'}>
        <input type="number" step="any" min="0" className={inputCls} {...register('amount', { required: true, validate: (v) => Number(v) > 0 })} />
      </Field>
      <Field label="Notes (optional)"><input className={inputCls} {...register('notes')} /></Field>
      <Button type="submit" disabled={pay.isPending} className="w-full">{pay.isPending ? 'Saving...' : 'Save payment'}</Button>
    </form>
  );
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const receiptRef = useRef(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: inv, isLoading, isError } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => (await api.get(`/invoices/${id}`)).data,
  });

  const del = useMutation({
    mutationFn: () => api.delete(`/invoices/${id}`),
    onSuccess: () => { invalidateAll(qc); navigate('/invoices'); },
    onError: (e) => setError(errMsg(e)),
  });

  const downloadPng = async () => {
    setError('');
    setBusy(true);
    try {
      const node = receiptRef.current;
      // logo load hone ka intezar
      await Promise.all([...node.querySelectorAll('img')].map((im) => (im.complete ? null : new Promise((r) => { im.onload = r; im.onerror = r; }))));
      const url = await toPng(node, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true });
      const a = document.createElement('a');
      a.href = url;
      a.download = `${inv.number}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setError('Could not create the image. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (isError || !inv) return <Notice>Could not load this invoice.</Notice>;

  const fullyPaid = inv.remaining <= 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link to="/invoices" className="text-sm text-navy hover:underline">&larr; Back to invoices</Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-navy">{inv.number}</h1>
          <StatusBadge status={inv.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={downloadPng} disabled={busy}>{busy ? 'Creating...' : 'Download Receipt (PNG)'}</Button>
          <Button variant="outline" disabled={fullyPaid} onClick={() => setPaying(true)}>
            {fullyPaid ? 'Fully paid' : 'Record payment'}
          </Button>
          <Link to={`/invoices/${id}/edit`} className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-gray-50">Edit</Link>
          <Button variant="danger" onClick={() => { setError(''); if (confirm('Delete this invoice?')) del.mutate(); }}>Delete</Button>
        </div>
      </div>

      {error && <Notice>{error}</Notice>}

      <Card>
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <div className="text-xs uppercase text-gray-500">Client</div>
            <Link to={`/parties/${inv.clientId}`} className="font-semibold text-navy hover:underline">{inv.client?.name}</Link>
            {inv.client?.phone && <div className="text-gray-500">{inv.client.phone}</div>}
          </div>
          <div>
            <div className="text-xs uppercase text-gray-500">Issue date</div>
            <div className="font-semibold">{formatDate(inv.issueDate)}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-500">Due date</div>
            <div className="font-semibold">{inv.dueDate ? formatDate(inv.dueDate) : '-'}</div>
          </div>
        </div>
      </Card>

      <Card className="overflow-x-auto !p-0">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Description</th><th className="px-4 py-3">Size</th>
              <th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Rate</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((i, n) => (
              <tr key={n} className="border-t border-gray-100">
                <td className="px-4 py-2.5">{i.description}</td>
                <td className="px-4 py-2.5">{i.size || '-'}</td>
                <td className="px-4 py-2.5 text-right">{i.qty}</td>
                <td className="px-4 py-2.5 text-right">{formatRs(i.rate)}</td>
                <td className="px-4 py-2.5 text-right">{formatRs(i.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <div className="space-y-1 text-sm sm:ml-auto sm:max-w-xs">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatRs(inv.subtotal)}</span></div>
          {inv.discount > 0 && <div className="flex justify-between text-brand-magenta"><span>Discount</span><span>- {formatRs(inv.discount)}</span></div>}
          <div className="flex justify-between border-t border-gray-100 pt-1 text-lg font-bold text-navy"><span>Total</span><span>{formatRs(inv.total)}</span></div>
          <div className="flex justify-between text-green-600"><span>Received</span><span>{formatRs(inv.paidAmount)}</span></div>
          <div className="flex justify-between font-bold"><span>Remaining</span><span>{formatRs(inv.remaining)}</span></div>
        </div>
        {inv.notes && <p className="mt-3 text-sm text-gray-500">Notes: {inv.notes}</p>}
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold text-navy">Payments on this invoice</h2>
        {inv.payments.length === 0 && <p className="text-sm text-gray-500">No payments yet.</p>}
        {inv.payments.map((p) => (
          <div key={p._id} className="flex justify-between border-t border-gray-100 py-2 text-sm first:border-0">
            <span>{formatDate(p.date)}{p.notes && <span className="text-gray-500"> - {p.notes}</span>}</span>
            <span className="font-semibold text-green-600">{formatRs(p.amount)}</span>
          </div>
        ))}
        <p className="mt-2 text-xs text-gray-500">To change a payment, go to the Payments page.</p>
      </Card>

      {/* Receipt jo PNG ban kar download hoti hai (screen se bahar) */}
      <div style={{ position: 'absolute', left: -10000, top: 0 }} aria-hidden="true">
        <InvoiceReceipt ref={receiptRef} inv={inv} />
      </div>

      {paying && (
        <Modal title="Record payment" onClose={() => setPaying(false)}>
          <PayForm inv={inv} onDone={() => setPaying(false)} />
        </Modal>
      )}
    </div>
  );
}