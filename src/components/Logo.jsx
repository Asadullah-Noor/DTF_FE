   import { BUSINESS } from '../config/business';

   export default function Logo({ className = 'h-10' }) {
     return <img src="/logo.png" alt={BUSINESS.name} className={`w-auto ${className}`} />;
   }