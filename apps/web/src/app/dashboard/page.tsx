'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  TrendingUp,
  DollarSign,
  AlertCircle,
  Repeat,
  FileText,
  Play,
  ArrowRight,
  Shield,
  Layers,
  Kanban
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [billingRunning, setBillingRunning] = useState(false);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'FINANCE')) {
      api.reports.getDashboard()
        .then((data) => setMetrics(data))
        .catch(() => setMetrics(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleTriggerBilling = async () => {
    setBillingRunning(true);
    setBillingMessage(null);
    try {
      const res = await api.invoices.triggerBilling();
      setBillingMessage(`Billing processed: ${res.data.created} invoice(s) generated, ${res.data.skipped} skipped.`);
      // Refresh metrics
      const fresh = await api.reports.getDashboard();
      setMetrics(fresh);
    } catch (err: any) {
      setBillingMessage(`Billing execution failed: ${err.message}`);
    } finally {
      setBillingRunning(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Please sign in to view your dashboard</h2>
        <Link href="/odoo/login" className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl inline-block text-sm font-semibold">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900">Welcome, {user.name}</h1>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full uppercase">
              {user.role}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Brightloop Subscription Management & Recurring Engine Platform
          </p>
        </div>

        {(user.role === 'ADMIN' || user.role === 'FINANCE') && (
          <div className="flex items-center space-x-3">
            <button
              onClick={handleTriggerBilling}
              disabled={billingRunning}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center space-x-2"
            >
              {billingRunning ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Due Billing Engine</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {billingMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
          {billingMessage}
        </div>
      )}

      {/* Admin / Finance Financial Metrics */}
      {(user.role === 'ADMIN' || user.role === 'FINANCE') && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : metrics ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Invoiced Revenue */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex justify-between items-center text-slate-500">
                    <span className="text-xs font-semibold uppercase tracking-wider">Invoiced Total</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    ₹{metrics.invoicedRevenue.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500">Total invoiced billing across periods</p>
                </div>

                {/* Collected Cash */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex justify-between items-center text-slate-500">
                    <span className="text-xs font-semibold uppercase tracking-wider">Collected Cash</span>
                    <DollarSign className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    ₹{metrics.collectedRevenue.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500">Reconciled manual & Razorpay payments</p>
                </div>

                {/* Outstanding Balance */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex justify-between items-center text-slate-500">
                    <span className="text-xs font-semibold uppercase tracking-wider">Outstanding</span>
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    ₹{metrics.outstandingBalance.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500">Awaiting customer payment</p>
                </div>

                {/* Active Subscriptions */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex justify-between items-center text-slate-500">
                    <span className="text-xs font-semibold uppercase tracking-wider">Active Subs</span>
                    <Repeat className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    {metrics.activeSubscriptionsCount}
                  </div>
                  <p className="text-[11px] text-slate-500">Recurring active client subscriptions</p>
                </div>
              </div>

              {/* Status Breakdown & Quick Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm">Subscription Status Breakdown</h3>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <div className="text-xl font-bold text-emerald-700">{metrics.subscriptionBreakdown.ACTIVE}</div>
                      <div className="text-xs text-emerald-800 font-medium">Active</div>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <div className="text-xl font-bold text-amber-700">{metrics.subscriptionBreakdown.PAUSED}</div>
                      <div className="text-xs text-amber-800 font-medium">Paused</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-xl font-bold text-slate-700">{metrics.subscriptionBreakdown.CLOSED}</div>
                      <div className="text-xs text-slate-600 font-medium">Closed</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm">Workflow Navigation</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <Link
                      href="/odoo/finance/invoices"
                      className="p-3 border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center justify-between font-medium text-slate-800"
                    >
                      <span>Invoices List</span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </Link>
                    <Link
                      href="/odoo/finance/kanban"
                      className="p-3 border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center justify-between font-medium text-slate-800"
                    >
                      <span>Due-Date Kanban</span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </Link>
                    <Link
                      href="/odoo/admin/products"
                      className="p-3 border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center justify-between font-medium text-slate-800"
                    >
                      <span>Manage Products</span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </Link>
                    <Link
                      href="/odoo/admin/staff"
                      className="p-3 border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center justify-between font-medium text-slate-800"
                    >
                      <span>Staff & Assignments</span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </Link>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Customer Portal Quick Actions */}
      {user.role === 'CUSTOMER' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Repeat className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">My Subscriptions</h3>
            <p className="text-sm text-slate-600">
              View your active Brightloop service subscriptions, billing frequencies, and renewal dates.
            </p>
            <Link
              href="/odoo/customer/subscriptions"
              className="inline-flex items-center space-x-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              <span>Manage Subscriptions</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">Invoices & Payments</h3>
            <p className="text-sm text-slate-600">
              Review current outstanding balances, inspect historical tax snapshots, and pay online with Razorpay.
            </p>
            <Link
              href="/odoo/customer/invoices"
              className="inline-flex items-center space-x-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              <span>View & Pay Invoices</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Marketing Quick Actions */}
      {user.role === 'MARKETING' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-lg text-slate-900">Sales Quotation Management</h3>
          <p className="text-sm text-slate-600">
            Create proposals from quotation templates for your assigned customers, apply discounts, and track customer acceptances.
          </p>
          <Link
            href="/odoo/marketing/quotations"
            className="inline-flex items-center space-x-2 text-sm font-semibold text-purple-600 hover:text-purple-700"
          >
            <span>Open Quotation Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
