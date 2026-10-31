'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Check, ShieldCheck, Zap, ArrowRight, BarChart2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);

  useEffect(() => {
    api.plans.list()
      .then((data) => setPlans(data || []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      router.push(`/odoo/register?plan=${planId}`);
      return;
    }
    setSubscribingId(planId);
    try {
      await api.subscriptions.create({ planId });
      router.push('/odoo/customer/subscriptions');
    } catch (err: any) {
      alert(err.message || 'Failed to subscribe to plan');
    } finally {
      setSubscribingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-16 py-4 sm:py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2rem] border border-violet-100 bg-white px-6 py-10 shadow-sm sm:px-10 lg:px-14 lg:py-16">
        <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-violet-100/70 blur-3xl" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
        <div className="inline-flex items-center space-x-2 bg-violet-50 border border-violet-200 px-3 py-1 rounded-full text-xs font-semibold text-violet-800">
          <Zap className="w-3.5 h-3.5 text-violet-600" />
          <span>Subscription billing, in one workspace</span>
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-950 leading-[1.08]">
          Make recurring revenue feel <span className="text-violet-600">effortless.</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-xl leading-8">
          Manage plans, subscriptions, invoices and payments from one clear workspace built for your team and your customers.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            href="/odoo/register"
            className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl shadow-md shadow-violet-600/20 transition-all flex items-center space-x-2"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/odoo/login"
            className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-all"
          >
            Sign In to Portal
          </Link>
        </div>
        <p className="text-xs text-slate-400">Clear billing records · Role-based workspace · Customer self-service</p>
        </div>
        <div className="relative rounded-3xl border border-violet-100 bg-[#f8f7ff] p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-slate-500">A clearer way to manage billing</p><p className="mt-1 text-xl font-bold text-slate-900">One connected workspace</p></div><div className="rounded-2xl bg-white p-3 text-violet-600 shadow-sm"><BarChart2 className="h-5 w-5" /></div></div>
          <div className="mt-6 space-y-3">
            {[['Plans & products', 'Configure your catalog'], ['Invoices & payments', 'Track every billing event'], ['Customer portal', 'Give customers control']].map(([title, detail], index) => (
              <div key={title} className="flex items-center gap-3 rounded-2xl border border-white bg-white/90 p-4 shadow-sm"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-sm font-bold text-violet-700">0{index + 1}</div><div><p className="text-sm font-semibold text-slate-900">{title}</p><p className="mt-0.5 text-xs text-slate-500">{detail}</p></div><Check className="ml-auto h-4 w-4 text-violet-500" /></div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/70 px-4 py-3 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-violet-600" /> Access follows your workspace role</div>
        </div>
        </div>
      </section>

      {/* Subscription Plans Section */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
            Available Subscription Plans
          </h2>
          <p className="text-slate-600">
            Flexible billing intervals in Indian Rupees (INR ₹)
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-8 text-slate-500 bg-white rounded-2xl border border-slate-200">
            No active plans found. Please seed the database or create plans in the Admin console.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                      {p.billingInterval}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{p.product?.name || 'Software Service'}</p>
                  </div>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-extrabold text-slate-900">₹{p.price.toLocaleString()}</span>
                    <span className="text-xs text-slate-500">/{p.billingInterval.toLowerCase()}</span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>18% Base GST Snapshots</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{p.pauseAllowed ? 'Pause/Resume Allowed' : 'Standard Renewal'}</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Razorpay & Manual Payments</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-6">
                  <button
                    onClick={() => handleSubscribe(p.id)}
                    disabled={subscribingId === p.id}
                    className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-1.5 disabled:opacity-60"
                  >
                    {subscribingId === p.id ? (
                      <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <span>Subscribe Now</span>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-slate-200">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900">Due Processor Engine</h3>
          <p className="text-sm text-slate-600">
            Automatically calculates daily, weekly, monthly, and yearly intervals without double-billing or skipped cycles.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <BarChart2 className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900">Finance & Aging Kanban</h3>
          <p className="text-sm text-slate-600">
            Clear separation between invoiced revenue and collected cash, with due-date kanban cards and quarterly reports.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900">Four-Role RBAC</h3>
          <p className="text-sm text-slate-600">
            Strict isolation across Admin, Finance, Marketing, and Customer accounts. Never leaks cross-customer records.
          </p>
        </div>
      </div>
    </div>
  );
}
