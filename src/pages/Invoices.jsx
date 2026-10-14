import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { formatRs } from '../lib/money';
import { formatDate } from '../lib/format';
import StatusBadge from '../components/StatusBadge';
import { Card, Button, inputCls } from '../components/ui';

const TABS = [['', 'All'], ['pending', 'Pending'], ['partial_paid', 'Partial Paid'], ['paid', 'Paid']];

export default function Invoices() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', status, search, page],
    queryFn: async () =>
      (await api.get('/invoices', { params: { status: status || undefined, search: search || undefined, page, limit: 50 } })).data,
  });
  const items = data?.items || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">Invoices</h1>
        <Link to="/invoices/new" className="rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-dark">
          + New invoice
        </Link>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          {TABS.map(([v, label]) => (
            <button
              key={v}
              onClick={() => { setStatus(v); setPage(1); }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${status === v ? 'bg-navy text-white' : 'bg-white text-ink border border-gray-300'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          className={inputCls + ' sm:ml-auto sm:max-w-xs !mt-0'}
          placeholder="Search invoice no (INV-0001)"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <Card className="overflow-x-auto !p-0">
        <table className="w-full min-w-[780px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Received</th>
              <th className="px-4 py-3 text-right">Remaining</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan="7" className="p-6 text-center text-gray-500">Loading...</td></tr>}
            {!isLoading && items.length === 0 && <tr><td colSpan="7" className="p-6 text-center text-gray-500">No invoices found</td></tr>}
            {items.map((i) => (
              <tr key={i._id} className="border-t border-gray-100">
                <td className="px-4 py-2.5 font-medium"><Link to={`/invoices/${i._id}`} className="text-navy hover:underline">{i.number}</Link></td>
                <td className="px-4 py-2.5">{i.client?.name}</td>
                <td className="whitespace-nowrap px-4 py-2.5">{formatDate(i.issueDate)}</td>
                <td className="px-4 py-2.5 text-right">{formatRs(i.total)}</td>
                <td className="px-4 py-2.5 text-right text-green-600">{formatRs(i.paidAmount)}</td>
                <td className="px-4 py-2.5 text-right font-semibold">{formatRs(i.remaining)}</td>
                <td className="px-4 py-2.5"><StatusBadge status={i.status} /></td>
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
    </div>
  );
}