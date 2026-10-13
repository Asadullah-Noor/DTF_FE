import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigate, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api/client';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  const { login, isAuthed } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  if (isAuthed) return <Navigate to="/" replace />;

  const onSubmit = async ({ email, password }) => {
    setServerError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setServerError(errMsg(err));
    }
  };

  const input =
    'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-navy focus:ring-2 focus:ring-brand-cyan/30';

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-6 flex justify-center">
          <Logo className="h-16" />
        </div>
        <h1 className="mb-1 text-center text-xl font-bold text-navy">Ledger Login</h1>
        <p className="mb-6 text-center text-sm text-gray-500">Sign in to continue</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input type="email" autoComplete="username" className={input} {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-brand-magenta">{errors.email.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input type="password" autoComplete="current-password" className={input} {...register('password')} />
            {errors.password && <p className="mt-1 text-xs text-brand-magenta">{errors.password.message}</p>}
          </div>

          {serverError && (
            <div className="rounded-lg bg-brand-magenta/10 px-3 py-2 text-sm text-brand-magenta">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-navy py-2.5 text-sm font-semibold text-white transition hover:bg-navy-dark disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
