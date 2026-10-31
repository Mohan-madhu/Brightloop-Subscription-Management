'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

function ActivateContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token || !email) {
      setStatus('error');
      setMessage('Missing activation token or email address in link.');
      return;
    }

    api.auth.activate(token, email)
      .then((res) => {
        setStatus('success');
        setMessage(res.message || 'Account activated successfully!');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Activation failed or token has expired.');
      });
  }, [token, email]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
      {status === 'loading' && (
        <div className="space-y-4">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 text-sm">Verifying your account activation token...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Email Verified & Account Activated</h2>
          <p className="text-slate-600 text-sm">{message}</p>
          <div className="pt-4">
            <Link
              href="/login"
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm inline-block"
            >
              Proceed to Login
            </Link>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-600 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Activation Error</h2>
          <p className="text-slate-600 text-sm">{message}</p>
          <div className="pt-4">
            <Link
              href="/login"
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm inline-block"
            >
              Return to Login
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ActivatePage() {
  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-6">
      <Suspense fallback={
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 text-sm mt-3">Loading activation page...</p>
        </div>
      }>
        <ActivateContent />
      </Suspense>
    </div>
  );
}
