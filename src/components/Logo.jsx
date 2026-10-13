// Later this will read logoUrl from Settings
export default function Logo({ className = 'h-10' }) {
  return <img src="/logo.png" alt="Waqas DTF Printing" className={`w-auto ${className}`} />;
}
