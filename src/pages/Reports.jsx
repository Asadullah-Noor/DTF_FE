import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { formatRs } from '../lib/money';
import { Card, inputCls } from '../components/ui';

function PartyList({ title, endpoint, tone, hint }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', endpoint],
    queryFn: async () => (await api.get(`/reports/${endpoint}`)).data,
  });
  return (
    <Card className="overflow-x-auto !p-0">
      <div className="p-4 pb-2">
        <h2 className="font-semibold text-navy">{title}</h2>
        <p className="text-xs text-gray-500">{hint}</p>
      </div>
      <table className="w-full min-w-[420px] text-sm">
        <tbody>
          {isLoading && <tr><td className="p-6 text-center text-gray-500">Loading...</td></tr>}
          {data?.items.length === 0 && <tr><td className="p-6 text-center text-gray-500">Nothing here</td></tr>}
          {data?.items.map((r) => (
            <tr key={r._id} className="border-t border-gray-100">
              <td className="px-4 py-2.5">
                <Link to={`/parties/${r._id}`} className="font-medium text-navy hover:underline">{r.name}</Link>
                {r.phone && <div className="text-xs text-gray-500">{r.phone}</div>}
              </td>
              <td className={`px-4 py-2.5 text-right font-semibold ${tone}`}>{formatRs(r.amount)}</td>
            </tr>
          ))}
        </tbody>
        {data && (
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
              <td className="px-4 py-3">Total</td>
              <td className={`px-4 py-3 text-right ${tone}`}>{formatRs(data.total)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </Card>
  );
}

function Monthly() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const { data: d } = useQuery({
    queryKey: ['reports', 'monthly', month],
    queryFn: async () => (await api.get('/reports/monthly-summary', { params: { month } })).data,
    enabled: !!month,
  });

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <label className="text-xs text-gray-500">Month</label>
        <input type="month" className={inputCls} value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>
      {d && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border-t-4 !border-t-brand-cyan">
              <div className="text-sm text-gray-500">Sales ({d.invoiceCount} invoices)</div>
              <div className="text-2xl font-bold text-navy">{formatRs(d.sales)}</div>
            </Card>
            <Card className="border-t-4 !border-t-brand-yellow">
              <div className="text-sm text-gray-500">Expenses</div>
              <div className="text-2xl font-bold text-navy">{formatRs(d.expenses)}</div>
            </Card>
            <Card className={`border-t-4 ${d.profit >= 0 ? '!border-t-green-500' : '!border-t-brand-magenta'}`}>
              <div className="text-sm text-gray-500">{d.profit >= 0 ? 'Profit' : 'Loss'}</div>
              <div className={`text-2xl font-bold ${d.profit >= 0 ? 'text-green-600' : 'text-brand-magenta'}`}>{formatRs(Math.abs(d.profit))}</div>
            </Card>
          </div>
          <Card>
            <h2 className="mb-2 font-semibold text-navy">Expenses by category</h2>
            {d.expensesByCategory.length === 0 && <p className="text-sm text-gray-500">No expenses this month.</p>}
            {d.expensesByCategory.map((c) => (
              <div key={c.category} className="flex justify-between border-t border-gray-100 py-2 text-sm first:border-0">
                <span>{c.category}</span><span className="font-semibold">{formatRs(c.total)}</span>
              </div>
            ))}
          </Card>
          <p className="text-xs text-gray-500">Sales = invoices issued in this month. Profit = sales minus expenses.</p>
        </>
      )}
    </div>
  );
}

const TABS = [['recv', 'Receivables'], ['pay', 'Payables'], ['month', 'Monthly summary']];

export default function Reports() {
  const [tab, setTab] = useState('recv');
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy">Reports</h1>
      <div className="flex flex-wrap gap-2">
        {TABS.map(([v, label]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === v ? 'bg-navy text-white' : 'border border-gray-300 bg-white'}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'recv' && <PartyList title="Receivables" endpoint="receivables" tone="text-green-600" hint="Clients - You will receive. Click a name for the statement (PDF/Excel)." />}
      {tab === 'pay' && <PartyList title="Payables" endpoint="payables" tone="text-brand-magenta" hint="Suppliers - You will pay. Click a name for the statement (PDF/Excel)." />}
      {tab === 'month' && <Monthly />}
    </div>
  );
}