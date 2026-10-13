import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api, { errMsg } from '../api/client';
import { formatRs } from '../lib/money';
import { formatDate } from '../lib/format';
import { downloadFile } from '../lib/download';
import { Card, Button, Notice, inputCls } from '../components/ui';

const FIELDS = [
  ['type', 'Type (client/supplier)'],
  ['date', 'Date'],
  ['party', 'Client / Party name'],
  ['debit', 'Debit'],
  ['credit', 'Credit'],
  ['notes', 'Notes'],
];

const badge = {
  ok: 'bg-green-50 text-green-700',
  duplicate: 'bg-brand-yellow/20 text-yellow-800',
  error: 'bg-brand-magenta/10 text-brand-magenta',
};

export default function ImportExport() {
  const qc = useQueryClient();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [allowed, setAllowed] = useState(new Set()); // duplicate rows jo user save karna chahta hai
  const [msg, setMsg] = useState(null);
  const [backupError, setBackupError] = useState('');

  const runPreview = useMutation({
    mutationFn: async ({ f, map }) => {
      const fd = new FormData();
      fd.append('file', f);
      if (map) fd.append('mapping', JSON.stringify(map));
      return (await api.post('/import/preview', fd)).data;
    },
    onSuccess: (data) => {
      setPreview(data);
      setMapping(data.mapping);
      setAllowed(new Set());
      setMsg(null);
    },
    onError: (e) => setMsg({ type: 'error', text: errMsg(e) }),
  });

  const confirm = useMutation({
    mutationFn: () => {
      const rows = preview.rows
        .filter((r) => r.status === 'ok' || (r.status === 'duplicate' && allowed.has(r.rowNum)))
        .map((r) => ({
          type: r.type, date: r.date, party: r.party,
          debit: r.debit, credit: r.credit, notes: r.notes || '',
          allowDuplicate: allowed.has(r.rowNum),
        }));
      return api.post('/import/confirm', { rows });
    },
    onSuccess: ({ data }) => {
      ['transactions', 'parties', 'statement'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      setMsg({
        type: 'ok',
        text: `Imported ${data.imported} entries. New parties created: ${data.createdParties}. Skipped: ${data.skipped}.`,
      });
      setPreview(null);
      setFile(null);
    },
    onError: (e) => setMsg({ type: 'error', text: errMsg(e) }),
  });

  const onFile = (f) => {
    if (!f) return;
    setFile(f);
    setMsg(null);
    runPreview.mutate({ f });
  };

  const toggle = (n) =>
    setAllowed((s) => {
      const next = new Set(s);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });

  const backup = async () => {
    setBackupError('');
    try {
      await downloadFile('/export/excel', {}, 'waqas-dtf-backup.xlsx');
    } catch {
      setBackupError('Backup download failed. Please try again.');
    }
  };

  const s = preview?.summary;
  const saveCount = s ? s.ok + allowed.size : 0;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-navy">Import / Export</h1>

      <Card>
        <h2 className="font-semibold text-navy">Backup (Export to Excel)</h2>
        <p className="mb-3 text-sm text-gray-500">Downloads parties, transactions, invoices and expenses in one Excel file.</p>
        <Button onClick={backup}>Download backup</Button>
        {backupError && <div className="mt-3"><Notice>{backupError}</Notice></div>}
      </Card>

      <Card>
        <h2 className="font-semibold text-navy">Import from Excel</h2>
        <p className="mb-3 text-sm text-gray-500">
          Upload a .xlsx file with columns: Type, Date, Client, Debit, Credit. First row must be the header.
        </p>
        <input type="file" accept=".xlsx" onChange={(e) => onFile(e.target.files[0])} className="text-sm" />
        {runPreview.isPending && <p className="mt-2 text-sm text-gray-500">Reading file...</p>}
      </Card>

      {msg && <Notice type={msg.type}>{msg.text}</Notice>}

      {preview && (
        <>
          <Card>
            <h2 className="mb-1 font-semibold text-navy">Column mapping</h2>
            <p className="mb-3 text-sm text-gray-500">Check which file column matches each field.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FIELDS.map(([key, label]) => (
                <div key={key}>
                  <label className="text-xs text-gray-500">{label}</label>
                  <select
                    className={inputCls}
                    value={mapping[key] || ''}
                    onChange={(e) => setMapping({ ...mapping, [key]: e.target.value || null })}
                  >
                    <option value="">-- none --</option>
                    {preview.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <Button variant="outline" className="mt-3" onClick={() => runPreview.mutate({ f: file, map: mapping })}>
              Apply mapping
            </Button>
          </Card>

          {!preview.mappingComplete && (
            <Notice>Please map at least Date, Party name and Debit or Credit, then click Apply mapping.</Notice>
          )}

          {preview.mappingComplete && s && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Card><div className="text-xs text-gray-500">Rows</div><div className="text-xl font-bold">{s.total}</div></Card>
                <Card><div className="text-xs text-gray-500">Ready</div><div className="text-xl font-bold text-green-600">{s.ok}</div></Card>
                <Card><div className="text-xs text-gray-500">Duplicates</div><div className="text-xl font-bold text-yellow-700">{s.duplicates}</div></Card>
                <Card><div className="text-xs text-gray-500">Errors</div><div className="text-xl font-bold text-brand-magenta">{s.errors}</div></Card>
              </div>

              {s.newParties.length > 0 && (
                <Notice type="ok">
                  New parties to be created: {s.newParties.map((p) => `${p.name} (${p.type})`).join(', ')}
                </Notice>
              )}

              <Card className="overflow-x-auto !p-0">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-3">Row</th>
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3">Party</th>
                      <th className="px-3 py-3 text-right">Debit</th>
                      <th className="px-3 py-3 text-right">Credit</th>
                      <th className="px-3 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r) => (
                      <tr key={r.rowNum} className="border-t border-gray-100">
                        <td className="px-3 py-2">{r.rowNum}</td>
                        <td className="whitespace-nowrap px-3 py-2">{r.date ? formatDate(r.date) : '-'}</td>
                        <td className="px-3 py-2">
                          {r.party || '-'}
                          <div className="text-xs capitalize text-gray-400">
                            {r.type}{!r.partyExists && r.status !== 'error' ? ' • new' : ''}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">{r.debit ? formatRs(r.debit) : ''}</td>
                        <td className="px-3 py-2 text-right">{r.credit ? formatRs(r.credit) : ''}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge[r.status]}`}>
                            {r.status === 'ok' ? 'Ready' : r.status === 'duplicate' ? r.duplicateReason : r.errors.join(', ')}
                          </span>
                          {r.status === 'duplicate' && (
                            <label className="mt-1 flex items-center gap-1 text-xs">
                              <input type="checkbox" checked={allowed.has(r.rowNum)} onChange={() => toggle(r.rowNum)} />
                              Import anyway
                            </label>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              <Button onClick={() => confirm.mutate()} disabled={confirm.isPending || saveCount === 0}>
                {confirm.isPending ? 'Importing...' : `Import ${saveCount} entries`}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}