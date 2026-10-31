'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.auth.login({ email, password });
      login(res.token, res.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (roleEmail: string, pass: string) => {
    setEmail(roleEmail);
    setPassword(pass);
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Sign in to Brightloop</h1>
          <p className="text-sm text-slate-500">Enter your credentials to access your account</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@brightloop.local"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Login Helpers */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="text-xs font-medium text-slate-500 text-center">Quick Demo Accounts:</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setDemoCredentials('admin@brightloop.local', 'Admin123!@#')}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-left"
            >
              <div className="font-bold text-slate-800">Admin</div>
              <div className="text-slate-500 text-[10px]">admin@brightloop.local</div>
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('finance@brightloop.local', 'Finance123!@#')}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-left"
            >
              <div className="font-bold text-slate-800">Finance</div>
              <div className="text-slate-500 text-[10px]">finance@brightloop.local</div>
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('marketing@brightloop.local', 'Marketing123!@#')}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-left"
            >
              <div className="font-bold text-slate-800">Marketing</div>
              <div className="text-slate-500 text-[10px]">marketing@brightloop.local</div>
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('customer@acmecorp.com', 'Customer123!@#')}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-left"
            >
              <div className="font-bold text-slate-800">Customer</div>
              <div className="text-slate-500 text-[10px]">customer@acmecorp.com</div>
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <Link href="/register" className="text-emerald-600 font-semibold hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
