import { useSettings } from '../hooks/useSettings';

export default function Logo({ className = 'h-10' }) {
  const { data: s } = useSettings();
  return (
    <img
      src={s?.logoUrl || '/logo.png'}
      alt={s?.businessName || 'Waqas DTF Printing'}
      className={`w-auto ${className}`}
    />
  );
}