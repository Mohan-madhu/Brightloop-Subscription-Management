'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiClientError, apiRequest } from '../../lib/api';
import { useSession } from '../../lib/session';
import { Button, FormField, Input, LoadingState } from '../shared/ui';

type AuthMode = 'login' | 'signup' | 'activate' | 'forgot' | 'reset';
type FieldErrors = Record<string, string>;
const passwordRules = [
  { label: 'At least 9 characters', test: (value: string) => value.length >= 9 },
  { label: 'At least one uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'At least one lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'At least one special character', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

function parseFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ApiClientError) || !Array.isArray(error.details)) return {};
  return Object.fromEntries(error.details.flatMap((detail) => {
    if (typeof detail !== 'object' || detail === null || !('path' in detail) || !('message' in detail)) return [];
    return [[String(detail.path).split('.')[0], String(detail.message)]];
  }));
}

function destinationFor(roles: readonly string[]): string {
  if (roles.includes('ADMIN')) return '/admin';
  if (roles.includes('MARKETING')) return '/marketing/customers';
  if (roles.includes('FINANCE')) return '/finance';
  return '/portal';
}

function safeDestination(requested: string | null, roles: readonly string[]): string {
  const authPaths = ['/login', '/signup', '/activate', '/forgot-password', '/password-reset'];
  if (!requested?.startsWith('/') || requested.startsWith('//') || authPaths.some((path) => requested === path || requested.startsWith(`${path}?`))) return destinationFor(roles);
  if (requested.startsWith('/admin') && !roles.includes('ADMIN')) return destinationFor(roles);
  if (requested.startsWith('/marketing') && !roles.some((role) => ['ADMIN', 'MARKETING'].includes(role))) return destinationFor(roles);
  if (requested.startsWith('/finance') && !roles.some((role) => ['ADMIN', 'FINANCE'].includes(role))) return destinationFor(roles);
  if (requested.startsWith('/portal') && !roles.includes('CUSTOMER')) return destinationFor(roles);
  return requested;
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, user, refresh } = useSession();
  const [values, setValues] = useState({ email: '', firstName: '', lastName: '', password: '', confirmPassword: '', token: '' });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) setValues((current) => ({ ...current, token }));
  }, [searchParams]);

  useEffect(() => {
    if (mode === 'login' && status === 'authenticated' && user) {
      router.replace(safeDestination(searchParams.get('next'), user.roles));
    }
  }, [mode, router, searchParams, status, user]);

  const update = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({ ...current, [key]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [key]: '' }));
  };
  const validPassword = passwordRules.every((rule) => rule.test(values.password));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    setMessage('');
    setFieldErrors({});

    try {
      if (mode === 'signup') {
        if (!validPassword) throw new Error('Meet every password requirement before creating your account.');
        await apiRequest<{ accepted: boolean }>('/auth/signup', { method: 'POST', body: { email: values.email, firstName: values.firstName, ...(values.lastName ? { lastName: values.lastName } : {}), password: values.password } });
        setMessage('If the account request was accepted, an activation email will be queued. Email delivery depends on the server configuration.');
      } else if (mode === 'activate') {
        await apiRequest<{ activated: boolean }>('/auth/activate', { method: 'POST', body: { token: values.token } });
        setMessage('Account activated. You can now sign in.');
      } else if (mode === 'login') {
        const result = await apiRequest<{ user: { roles: string[] } }>('/auth/login', { method: 'POST', body: { email: values.email, password: values.password } });
        await refresh();
        router.replace(safeDestination(searchParams.get('next'), result.user.roles));
      } else if (mode === 'forgot') {
        await apiRequest<{ accepted: boolean }>('/auth/password-reset/request', { method: 'POST', body: { email: values.email } });
        setMessage('If an active account matches that email, a password-reset message will be queued.');
      } else {
        if (!validPassword) throw new Error('Meet every password requirement before resetting your password.');
        if (values.password !== values.confirmPassword) throw new Error('Passwords do not match.');
        await apiRequest<{ passwordReset: boolean }>('/auth/password-reset/confirm', { method: 'POST', body: { token: values.token, password: values.password } });
        setMessage('Password reset completed. Sign in with your new password.');
      }
    } catch (cause) {
      setFieldErrors(parseFieldErrors(cause));
      setError(cause instanceof Error ? cause.message : 'The request could not be completed.');
    } finally {
      setPending(false);
    }
  }

  if (mode === 'login' && status === 'loading') return <main className="mx-auto max-w-md p-6"><LoadingState label="Restoring session…" /></main>;
  if (mode === 'login' && status === 'authenticated') return <main className="mx-auto max-w-md p-6"><LoadingState label="Opening your workspace…" /></main>;

  const title = { login: 'Sign in', signup: 'Create customer account', activate: 'Activate account', forgot: 'Reset your password', reset: 'Choose a new password' }[mode];

  return <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
    <section className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
      <Link href="/" className="text-sm font-semibold text-indigo-800">Brightloop</Link>
      <h1 className="mt-5 text-2xl font-semibold">{title}</h1>
      <form className="mt-6 space-y-4" onSubmit={(event) => void submit(event)} noValidate>
        {(mode === 'signup' || mode === 'login' || mode === 'forgot') && <FormField id="email" label="Email" error={fieldErrors.email} required><Input type="email" autoComplete="email" value={values.email} onChange={update('email')} required maxLength={320} /></FormField>}
        {mode === 'signup' && <>
          <FormField id="firstName" label="First name" error={fieldErrors.firstName} required><Input autoComplete="given-name" value={values.firstName} onChange={update('firstName')} required maxLength={100} /></FormField>
          <FormField id="lastName" label="Last name" error={fieldErrors.lastName}><Input autoComplete="family-name" value={values.lastName} onChange={update('lastName')} maxLength={100} /></FormField>
          <p className="text-xs text-slate-600">Email syntax is checked on submit. Availability and deliverability are not exposed by the current API, so they cannot be confirmed here.</p>
        </>}
        {(mode === 'login' || mode === 'signup' || mode === 'reset') && <FormField id="password" label={mode === 'reset' ? 'New password' : 'Password'} error={fieldErrors.password} required><Input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={values.password} onChange={update('password')} required /></FormField>}
        {(mode === 'signup' || mode === 'reset') && <ul aria-label="Password requirements" className="space-y-1 text-sm">{passwordRules.map((rule) => <li key={rule.label} className={rule.test(values.password) ? 'text-emerald-800' : 'text-slate-600'} aria-live="polite">{rule.test(values.password) ? 'Met:' : 'Required:'} {rule.label}</li>)}</ul>}
        {mode === 'reset' && <FormField id="confirmPassword" label="Confirm password" error={fieldErrors.confirmPassword} required><Input type="password" autoComplete="new-password" value={values.confirmPassword} onChange={update('confirmPassword')} required /></FormField>}
        {(mode === 'activate' || mode === 'reset') && <FormField id="token" label={mode === 'activate' ? 'Activation token' : 'Reset token'} description="Use the token from the email link." error={fieldErrors.token} required><Input value={values.token} onChange={update('token')} required minLength={20} maxLength={200} /></FormField>}
        {error && <p className="text-sm text-red-800" role="alert">{error}</p>}
        {message && <p className="text-sm text-emerald-800" role="status">{message}</p>}
        <Button type="submit" disabled={pending || ((mode === 'signup' || mode === 'reset') && !validPassword)} className="w-full">{pending ? 'Working…' : title}</Button>
      </form>
      <nav className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-indigo-800" aria-label="Account links">
        {mode !== 'login' && <Link href="/login">Sign in</Link>}
        {mode !== 'signup' && <Link href="/signup">Create account</Link>}
        {mode === 'login' && <Link href="/forgot-password">Forgot password?</Link>}
        {mode === 'forgot' && <Link href="/password-reset">I have a reset token</Link>}
      </nav>
    </section>
  </main>;
}