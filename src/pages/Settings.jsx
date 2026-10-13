import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api, { errMsg } from '../api/client';
import { useSettings } from '../hooks/useSettings';
import { Card, Field, Button, Notice, Modal, inputCls } from '../components/ui';
export default function Settings() {
  const qc = useQueryClient();
  const { data: s } = useSettings();
  const [bizMsg, setBizMsg] = useState(null);
  const [logoMsg, setLogoMsg] = useState(null);
  const [pwMsg, setPwMsg] = useState(null);

  const biz = useForm();
  useEffect(() => { if (s) biz.reset(s); }, [s]);

  const saveBiz = useMutation({
    mutationFn: (v) => api.put('/settings', { businessName: v.businessName, address: v.address, phone: v.phone }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); setBizMsg({ type: 'ok', text: 'Business details saved' }); },
    onError: (e) => setBizMsg({ type: 'error', text: errMsg(e) }),
  });

  const uploadLogo = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('logo', file);
      return api.post('/settings/logo', fd);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); setLogoMsg({ type: 'ok', text: 'Logo updated' }); },
    onError: (e) => setLogoMsg({ type: 'error', text: errMsg(e) }),
  });
  onSuccess: () => {
  pw.reset();
  setPwOpen(false);
  setPwMsg({ type: 'ok', text: 'Password changed successfully' });
}
  const pw = useForm();
   return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold text-navy">Settings</h1>

      <Card>
        <h2 className="mb-3 font-semibold text-navy">Business details</h2>
        <form onSubmit={biz.handleSubmit((v) => { setBizMsg(null); saveBiz.mutate(v); })} className="space-y-3">
          <Field label="Business name" error={biz.formState.errors.businessName && 'Business name is required'}>
            <input className={inputCls} {...biz.register('businessName', { required: true })} />
          </Field>
          <Field label="Address"><input className={inputCls} {...biz.register('address')} /></Field>
          <Field label="Phone"><input className={inputCls} {...biz.register('phone')} /></Field>
          {bizMsg && <Notice type={bizMsg.type}>{bizMsg.text}</Notice>}
          <Button type="submit" disabled={saveBiz.isPending}>{saveBiz.isPending ? 'Saving...' : 'Save'}</Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-navy">Logo</h2>
        {s?.logoUrl && <img src={s.logoUrl} alt="Logo" className="mb-3 h-16 w-auto" />}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => { setLogoMsg(null); e.target.files[0] && uploadLogo.mutate(e.target.files[0]); }}
          className="text-sm"
        />
        {logoMsg && <div className="mt-3"><Notice type={logoMsg.type}>{logoMsg.text}</Notice></div>}
      </Card>


    </div>
  );
}