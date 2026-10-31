'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Repeat, Pause, Play, AlertCircle, Plus, Check, ShieldCheck } from 'lucide-react';

export default function CustomerSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subs, pls] = await Promise.all([
        api.subscriptions.list(),
        api.plans.list()
      ]);
      setSubscriptions(subs || []);
      setAvailablePlans(pls || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load your subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubscribe = async (planId: string) => {
    setSubscribing(planId);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.subscriptions.create({ planId });
      setSuccess(`Successfully subscribed to ${res.plan?.name || 'plan'}!`);
      setShowSubscribeModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to subscribe to plan');
    } finally {
      setSubscribing(null);
    }
  };

  const handlePause = async (id: string) => {
    if (!confirm('Pause subscription? You will not be billed automatically until resumed.')) return;
    try {
      await api.subscriptions.pause(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResume = async (id: string) => {
    if (!confirm('Resume subscription? Recurring billing will reactivate.')) return;
    try {
      await api.subscriptions.resume(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Subscriptions</h1>
          <p className="text-sm text-slate-500">Manage your active Brightloop service packages, renewal dates, and billing intervals</p>
        </div>
        <button
          onClick={() => setShowSubscribeModal(true)}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Subscribe to New Plan</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2 font-medium">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
          <Repeat className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-lg">No active subscriptions yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Choose from our cloud subscription plans to get started right away.
          </p>
          <button
            onClick={() => setShowSubscribeModal(true)}
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors inline-flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Browse & Subscribe to a Plan</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-500 uppercase">{sub.subscriptionNumber}</span>
                  <h3 className="font-bold text-slate-900 text-lg">{sub.plan?.name}</h3>
                  <div className="text-xs text-slate-500">{sub.plan?.product?.name}</div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase border ${
                  sub.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : sub.status === 'PAUSED'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}>
                  {sub.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Billing Interval</span>
                  <span className="font-bold text-slate-800">{sub.billingFrequency}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Next Billing Date</span>
                  <span className="font-bold text-slate-800">
                    {new Date(sub.nextBillingDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                {sub.status === 'ACTIVE' && (
                  <button
                    onClick={() => handlePause(sub.id)}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold text-xs rounded-xl border border-amber-200 flex items-center space-x-1"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause Subscription</span>
                  </button>
                )}
                {sub.status === 'PAUSED' && (
                  <button
                    onClick={() => handleResume(sub.id)}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-xl border border-emerald-200 flex items-center space-x-1"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume Subscription</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Subscribe to Plan Modal */}
      {showSubscribeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Choose a Subscription Plan</h3>
                <p className="text-xs text-slate-500 mt-1">Select an active plan to add to your account portfolio</p>
              </div>
              <button
                onClick={() => setShowSubscribeModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {availablePlans.map((p) => (
                <div
                  key={p.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-4 hover:border-emerald-300 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                        {p.billingInterval}
                      </span>
                    </div>
                    <h4 className="font-bold text-base text-slate-900">{p.name}</h4>
                    <p className="text-xs text-slate-500">{p.product?.name || 'Software Subscription'}</p>
                    <div className="text-2xl font-extrabold text-slate-900">
                      ₹{p.price.toLocaleString()}
                      <span className="text-xs text-slate-500 font-normal">/{p.billingInterval.toLowerCase()}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSubscribe(p.id)}
                    disabled={subscribing === p.id}
                    className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center space-x-1"
                  >
                    {subscribing === p.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Subscribe Now</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
