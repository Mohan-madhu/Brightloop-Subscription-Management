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
    <div className="max-w-6xl mx-auto space-y-16 py-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-xs font-semibold text-emerald-800">
          <Zap className="w-3.5 h-3.5 text-emerald-600" />
          <span>Automated Recurring Billing Engine</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
          Next-Generation Subscription <br />
          <span className="text-emerald-600">Lifecycle & Financial Platform</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Manage products, configurable variants, quotations, recurring invoices with tax-exclusive 18% GST snapshots, and Razorpay test checkout.
        </p>
        <div className="flex justify-center space-x-4 pt-4">
          <Link
            href="/odoo/register"
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md transition-all flex items-center space-x-2"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/odoo/login"
            className="px-6 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-all shadow-sm"
          >
            Sign In to Portal
          </Link>
        </div>
      </div>

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
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No active plans found. Please seed the database or create plans in the Admin console.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
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
                    className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-sm rounded-xl transition-colors border border-emerald-200 flex items-center justify-center space-x-1.5"
                  >
                    {subscribingId === p.id ? (
                      <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
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
