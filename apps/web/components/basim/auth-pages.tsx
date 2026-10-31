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
  const isSignup = mode === 'signup';

  return <main className={isSignup ? 'relative isolate min-h-screen overflow-hidden bg-[#f7f7fc] px-4 py-8 text-slate-950 sm:px-6 sm:py-12' : 'min-h-screen bg-slate-50 px-4 py-10 sm:px-6'}>
    {isSignup && <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-0 overflow-hidden"><div className="absolute -right-40 -top-44 h-[34rem] w-[34rem] rounded-full bg-violet-200/50 blur-3xl" /><div className="absolute -bottom-48 -left-40 h-[30rem] w-[30rem] rounded-full bg-indigo-100/60 blur-3xl" /></div>}
    <section className={isSignup ? 'relative z-10 mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-white bg-white shadow-2xl shadow-indigo-950/10 lg:min-h-[680px] lg:grid-cols-[0.85fr_1.15fr]' : 'mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-5 sm:p-7'}>
      {isSignup && <aside className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#211747] via-[#3b2a7a] to-violet-700 p-7 text-white sm:p-10 lg:p-12">
        <div aria-hidden="true" className="absolute -right-20 top-24 h-64 w-64 rounded-full border border-white/10" /><div aria-hidden="true" className="absolute -right-8 top-36 h-40 w-40 rounded-full border border-white/10" />
        <div className="relative"><Link href="/" className="inline-flex items-center gap-3 rounded-xl" aria-label="Brightloop home"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-2xl font-black text-violet-700">b</span><span><span className="block text-lg font-extrabold tracking-tight">brightloop</span><span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200">Subscriptions</span></span></Link></div>
        <div className="relative my-10 lg:my-0"><p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-200">Start with clarity</p><h2 className="mt-4 max-w-sm text-3xl font-bold leading-tight tracking-tight sm:text-4xl">One account for your subscription workspace.</h2><p className="mt-5 max-w-sm text-sm leading-6 text-violet-100">Create your customer account to access the Brightloop portal and manage your subscription billing.</p>
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"><span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15 text-lg">↗</span><p className="text-sm font-medium leading-5 text-white">If accepted, an activation email will be queued for your account.</p></div>
        </div>
        <p className="relative text-xs text-violet-200">Brightloop · Subscription management</p>
      </aside>}
      <div className={isSignup ? 'p-6 sm:p-10 lg:p-12' : ''}>
      {!isSignup && <Link href="/" className="text-sm font-semibold text-indigo-800">Brightloop</Link>}
      <div className={isSignup ? 'mx-auto max-w-md' : ''}>
      <p className={isSignup ? 'text-xs font-bold uppercase tracking-[0.16em] text-violet-700' : 'sr-only'}>{isSignup ? 'Customer portal' : 'Account'}</p>
      <h1 className={isSignup ? 'mt-2 text-3xl font-bold tracking-tight text-slate-950' : 'mt-5 text-2xl font-semibold'}>{isSignup ? 'Create your account' : title}</h1>
      <p className={isSignup ? 'mt-2 text-sm leading-6 text-slate-600' : 'sr-only'}>{isSignup ? 'Enter your details to request a secure Brightloop customer account.' : title}</p>
      <form className={`${isSignup ? 'mt-7' : 'mt-6'} space-y-4`} onSubmit={(event) => void submit(event)} noValidate>
        {(mode === 'signup' || mode === 'login' || mode === 'forgot') && <FormField id="email" label="Email" error={fieldErrors.email} required><Input type="email" autoComplete="email" value={values.email} onChange={update('email')} required maxLength={320} /></FormField>}
        {mode === 'signup' && <>
          <div className="grid gap-4 sm:grid-cols-2"><FormField id="firstName" label="First name" error={fieldErrors.firstName} required><Input autoComplete="given-name" value={values.firstName} onChange={update('firstName')} required maxLength={100} /></FormField>
          <FormField id="lastName" label="Last name" error={fieldErrors.lastName}><Input autoComplete="family-name" value={values.lastName} onChange={update('lastName')} maxLength={100} /></FormField></div>
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">If accepted, an activation email will be queued. Delivery depends on the email service configuration.</p>
        </>}
        {(mode === 'login' || mode === 'signup' || mode === 'reset') && <FormField id="password" label={mode === 'reset' ? 'New password' : 'Password'} error={fieldErrors.password} required><Input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={values.password} onChange={update('password')} required /></FormField>}
        {(mode === 'signup' || mode === 'reset') && <ul aria-label="Password requirements" className={isSignup ? 'grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2' : 'space-y-1 text-sm'}>{passwordRules.map((rule) => <li key={rule.label} className={`${rule.test(values.password) ? 'text-emerald-800' : 'text-slate-600'} ${isSignup ? 'flex items-center gap-2 text-xs' : ''}`} aria-live="polite">{isSignup && <span className="sr-only">{rule.test(values.password) ? 'Met: ' : 'Required: '}</span>}<span aria-hidden={isSignup || undefined} className={isSignup ? `grid h-5 w-5 shrink-0 place-items-center rounded-full ${rule.test(values.password) ? 'bg-emerald-100' : 'bg-white'}` : ''}>{isSignup ? (rule.test(values.password) ? '✓' : '·') : (rule.test(values.password) ? 'Met:' : 'Required:')}</span>{rule.label}</li>)}</ul>}
        {mode === 'reset' && <FormField id="confirmPassword" label="Confirm password" error={fieldErrors.confirmPassword} required><Input type="password" autoComplete="new-password" value={values.confirmPassword} onChange={update('confirmPassword')} required /></FormField>}
        {(mode === 'activate' || mode === 'reset') && <FormField id="token" label={mode === 'activate' ? 'Activation token' : 'Reset token'} description="Use the token from the email link." error={fieldErrors.token} required><Input value={values.token} onChange={update('token')} required minLength={20} maxLength={200} /></FormField>}
        {error && <p className="text-sm text-red-800" role="alert">{error}</p>}
        {message && <p className="text-sm text-emerald-800" role="status">{message}</p>}
        <Button type="submit" disabled={pending || ((mode === 'signup' || mode === 'reset') && !validPassword)} className={`w-full ${isSignup ? '!min-h-12 !rounded-xl !bg-violet-600 !text-sm !font-bold !shadow-lg !shadow-violet-600/20 hover:!bg-violet-700' : ''}`}>{pending ? 'Working…' : (isSignup ? 'Create customer account' : title)}</Button>
      </form>
      <nav className={isSignup ? 'mt-6 text-center text-sm text-slate-600' : 'mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-indigo-800'} aria-label="Account links">
        {mode !== 'login' && <>{isSignup && 'Already have an account? '}<Link className={isSignup ? 'font-semibold text-violet-700 hover:text-violet-900' : ''} href="/login">Sign in</Link></>}
        {mode !== 'signup' && <Link href="/signup">Create account</Link>}
        {mode === 'login' && <Link href="/forgot-password">Forgot password?</Link>}
        {mode === 'forgot' && <Link href="/password-reset">I have a reset token</Link>}
      </nav>
      {isSignup && <p className="mt-5 text-center text-xs leading-5 text-slate-500">Account activation is completed through the email link when delivery is configured.</p>}
      </div>
      </div>
    </section>
  </main>;
}
