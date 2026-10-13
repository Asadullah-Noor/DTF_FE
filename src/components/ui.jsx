export const inputCls =
  'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-navy focus:ring-2 focus:ring-brand-cyan/30';

export function Field({ label, error, children }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-brand-magenta">{error}</p>}
    </div>
  );
}

export function Button({ variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-navy text-white hover:bg-navy-dark',
    outline: 'border border-gray-300 bg-white text-ink hover:bg-gray-50',
    danger: 'bg-brand-magenta text-white hover:opacity-90',
  };
  return (
    <button
      {...props}
      className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${styles[variant]} ${className}`}
    />
  );
}

export function Card({ className = '', children }) {
  return <div className={`rounded-xl border border-gray-200 bg-white p-4 sm:p-5 ${className}`}>{children}</div>;
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">{title}</h2>
          <button onClick={onClose} className="text-2xl leading-none text-gray-400 hover:text-ink">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Notice({ type = 'error', children }) {
  const cls = type === 'error' ? 'bg-brand-magenta/10 text-brand-magenta' : 'bg-green-50 text-green-700';
  return <div className={`rounded-lg px-3 py-2 text-sm ${cls}`}>{children}</div>;
}