'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { UserPlus, AlertCircle, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Password validation state
  const hasMinLen = password.length >= 9;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isPassValid = hasMinLen && hasUpper && hasLower && hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isPassValid) {
      setError('Please satisfy all password complexity requirements.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.auth.register({ email, name, phone, password });
      setSuccess('Account created successfully! Redirecting...');
      login(res.token, res.user);
      setTimeout(() => router.push('/odoo/dashboard'), 1500);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 sm:py-10">
      <div className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5 md:grid-cols-[0.8fr_1fr]">
        <aside className="relative hidden overflow-hidden bg-slate-950 p-10 text-white md:flex md:flex-col md:justify-between">
          <div className="absolute -right-24 -top-20 h-64 w-64 rounded-full bg-violet-600/40 blur-3xl" />
          <div className="relative"><div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500 text-2xl font-black">b</div><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">Brightloop customer portal</p><h2 className="mt-4 text-3xl font-bold leading-tight">Your subscriptions, in your hands.</h2><p className="mt-4 text-sm leading-6 text-slate-300">Create an account to review your plans, invoices and payment history from one place.</p></div>
          <div className="relative space-y-3 text-sm text-slate-200"><p className="rounded-2xl border border-white/10 bg-white/5 p-4">View your active and past subscriptions</p><p className="rounded-2xl border border-white/10 bg-white/5 p-4">Keep track of upcoming invoice due dates</p></div>
        </aside>
        <div className="p-6 sm:p-10 space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">Get started</p>
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="text-sm text-slate-500">Sign up to manage your subscriptions and billing</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Name / Company Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Global Corp"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@acmecorp.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 9876543210"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />

            {/* Password Complexity Checklist */}
            <div className="mt-2 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px]">
              <div className={hasMinLen ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                • Minimum 9 characters
              </div>
              <div className={hasUpper ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                • At least one uppercase letter (A-Z)
              </div>
              <div className={hasLower ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                • At least one lowercase letter (a-z)
              </div>
              <div className={hasSpecial ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                • At least one special symbol (!@#$%^&*...)
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isPassValid}
            className={`w-full py-2.5 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-2 ${
              isPassValid && !loading ? 'bg-violet-600 hover:bg-violet-700' : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link href="/odoo/login" className="text-violet-700 font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}
