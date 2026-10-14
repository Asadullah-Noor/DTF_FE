const MAP = {
  pending: ['Pending', 'bg-brand-magenta/10 text-brand-magenta'],
  partial_paid: ['Partial Paid', 'bg-brand-yellow/25 text-yellow-800'],
  paid: ['Paid', 'bg-green-50 text-green-700'],
};

export default function StatusBadge({ status }) {
  const [label, cls] = MAP[status] || MAP.pending;
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}