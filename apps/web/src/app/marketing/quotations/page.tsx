'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { FileText, Plus, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

export default function QuotationsPage() {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    planId: '',
    productId: '',
    quantity: 1,
    unitPrice: 5000,
    validityDays: 30,
    discountCode: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [q, c, p, pl] = await Promise.all([
        api.quotations.list(),
        api.users.list({ role: 'CUSTOMER' }),
        api.products.list(),
        api.plans.list()
      ]);
      setQuotations(q || []);
      setCustomers(c.data || []);
      setProducts(p || []);
      setPlans(pl || []);
      if (c.data?.length > 0 && !form.customerId) {
        setForm((prev) => ({ ...prev, customerId: c.data[0].id }));
      }
      if (p?.length > 0 && !form.productId) {
        setForm((prev) => ({ ...prev, productId: p[0].id, unitPrice: p[0].salesPrice }));
      }
      if (pl?.length > 0 && !form.planId) {
        setForm((prev) => ({ ...prev, planId: pl[0].id }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const line = {
        productId: form.productId,
        planId: form.planId,
        quantity: parseInt(form.quantity as any, 10),
        salesPrice: parseFloat(form.unitPrice as any),
        description: 'Subscription SaaS Line'
      };

      await api.quotations.create({
        customerId: form.customerId,
        planId: form.planId,
        validityDays: form.validityDays,
        discountCode: form.discountCode || undefined,
        lines: [line]
      });

      setShowModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAcceptQuotation = async (id: string) => {
    if (!confirm('Accept quotation and convert to linked active subscription?')) return;
    try {
      await api.quotations.accept(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quotations & Proposals</h1>
          <p className="text-sm text-slate-500">Draft customized proposals, apply promotional discounts, and convert accepted quotes to active subscriptions</p>
        </div>
        {(user?.role === 'MARKETING' || user?.role === 'ADMIN') && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Quotation</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quotations List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Commercial Proposals</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : quotations.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No quotations found. Click "New Quotation" to create a proposal.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Quote #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Subtotal</th>
                  <th className="p-3">Tax (18%)</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Expires At</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-bold text-slate-900">{q.quotationNumber}</td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-800">{q.customer?.name}</div>
                      <div className="text-[11px] text-slate-500">{q.customer?.email}</div>
                    </td>
                    <td className="p-3 font-mono">₹{q.subtotal.toLocaleString()}</td>
                    <td className="p-3 font-mono text-slate-500">₹{q.taxAmount.toLocaleString()}</td>
                    <td className="p-3 font-mono font-bold text-slate-900">₹{q.totalAmount.toLocaleString()}</td>
                    <td className="p-3 text-slate-500">{new Date(q.expiresAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                        q.status === 'ACCEPTED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : q.status === 'SENT'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {q.status !== 'ACCEPTED' && (
                        <button
                          onClick={() => handleAcceptQuotation(q.id)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-lg border border-emerald-200 transition-colors"
                        >
                          Accept & Convert
                        </button>
                      )}
                      {q.subscription && (
                        <span className="text-[11px] font-mono text-emerald-700">
                          Active Sub: {q.subscription.subscriptionNumber}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Quotation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Prepare Quotation</h3>
            <form onSubmit={handleCreateQuotation} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Customer</label>
                <select
                  required
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Subscription Plan</label>
                <select
                  required
                  value={form.planId}
                  onChange={(e) => setForm({ ...form, planId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                >
                  {plans.map((pl) => (
                    <option key={pl.id} value={pl.id}>{pl.name} - ₹{pl.price}/{pl.billingInterval.toLowerCase()}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.validityDays}
                    onChange={(e) => setForm({ ...form, validityDays: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Promotional Discount Code (Optional)</label>
                <input
                  type="text"
                  value={form.discountCode}
                  onChange={(e) => setForm({ ...form, discountCode: e.target.value })}
                  placeholder="e.g. WELCOME10 or FLAT500"
                  className="w-full px-3 py-2 border rounded-xl text-sm uppercase font-mono"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
                >
                  Issue Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
