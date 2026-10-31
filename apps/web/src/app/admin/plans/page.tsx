'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Layers, Plus, Percent, Tag, AlertCircle } from 'lucide-react';

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  // Forms
  const [planForm, setPlanForm] = useState({
    productId: '',
    name: '',
    description: '',
    billingInterval: 'MONTHLY',
    price: 5000,
    minQuantity: 1
  });

  const [taxForm, setTaxForm] = useState({ name: '', rate: 18.0, isDefault: false });
  const [discountForm, setDiscountForm] = useState({
    code: '',
    description: '',
    type: 'PERCENTAGE',
    value: 10,
    minPurchase: 1000,
    maxUses: 100
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, pr, t, d] = await Promise.all([
        api.plans.list(),
        api.products.list(),
        api.taxes.list(),
        api.discounts.list()
      ]);
      setPlans(p || []);
      setProducts(pr || []);
      setTaxes(t || []);
      setDiscounts(d || []);
      if (pr && pr.length > 0 && !planForm.productId) {
        setPlanForm((prev) => ({ ...prev, productId: pr[0].id }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetProductId = planForm.productId || products[0]?.id;
    if (!targetProductId) {
      alert('Please create at least one product in Products & Variants before creating a plan.');
      return;
    }
    try {
      await api.plans.create({
        ...planForm,
        productId: targetProductId
      });
      setShowPlanModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.taxes.create(taxForm);
      setShowTaxModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.discounts.create(discountForm);
      setShowDiscountModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subscription Plans & Billing Rules</h1>
          <p className="text-sm text-slate-500">Configure recurring plan intervals, taxes, and promotional discounts</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowTaxModal(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors border border-slate-300"
          >
            + New Tax Rule
          </button>
          <button
            onClick={() => setShowDiscountModal(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors border border-slate-300"
          >
            + New Discount
          </button>
          <button
            onClick={() => {
              if (products.length > 0) {
                setPlanForm((prev) => ({ ...prev, productId: prev.productId || products[0].id }));
              }
              setShowPlanModal(true);
            }}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Plan</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Subscription Plans */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Configured Plans</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((pl) => (
              <div key={pl.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                    {pl.billingInterval}
                  </span>
                  <span className="text-xs font-semibold text-emerald-600">{pl.status}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-base">{pl.name}</h3>
                <div className="text-2xl font-extrabold text-slate-900">
                  ₹{pl.price.toLocaleString()}
                  <span className="text-xs text-slate-500 font-normal">/{pl.billingInterval.toLowerCase()}</span>
                </div>
                <div className="text-xs text-slate-500">
                  Linked Product: <span className="font-semibold text-slate-700">{pl.product?.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Taxes & Discounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {/* Taxes */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 flex items-center space-x-2 text-sm">
              <Percent className="w-4 h-4 text-emerald-600" />
              <span>Configurable Tax Rates</span>
            </h3>
          </div>
          <div className="space-y-2">
            {taxes.map((t) => (
              <div key={t.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-xs">
                <div>
                  <span className="font-bold text-slate-800">{t.name}</span>
                  {t.isDefault && (
                    <span className="ml-2 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                      Default GST
                    </span>
                  )}
                </div>
                <span className="font-bold text-slate-900 font-mono text-sm">{t.rate}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Discounts */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 flex items-center space-x-2 text-sm">
              <Tag className="w-4 h-4 text-blue-600" />
              <span>Promotional Discounts</span>
            </h3>
          </div>
          <div className="space-y-2">
            {discounts.map((d) => (
              <div key={d.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-xs">
                <div>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {d.code}
                  </span>
                  <div className="text-[11px] text-slate-500 mt-1">{d.description || `${d.type} discount`}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900 font-mono">
                    {d.type === 'PERCENTAGE' ? `${d.value}%` : `₹${d.value}`}
                  </div>
                  <div className="text-[10px] text-slate-400">Used: {d.usedCount}/{d.maxUses}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Create Subscription Plan</h3>
            <form onSubmit={handleCreatePlan} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Product</label>
                <select
                  required
                  value={planForm.productId}
                  onChange={(e) => setPlanForm({ ...planForm, productId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="e.g. ERP Monthly Professional"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Interval</label>
                  <select
                    value={planForm.billingInterval}
                    onChange={(e) => setPlanForm({ ...planForm, billingInterval: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-semibold"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tax Modal */}
      {showTaxModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add Tax Rate</h3>
            <form onSubmit={handleCreateTax} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Name</label>
                <input
                  type="text"
                  required
                  value={taxForm.name}
                  onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })}
                  placeholder="e.g. GST 18%"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={taxForm.rate}
                  onChange={(e) => setTaxForm({ ...taxForm, rate: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="taxDefault"
                  checked={taxForm.isDefault}
                  onChange={(e) => setTaxForm({ ...taxForm, isDefault: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-violet-500"
                />
                <label htmlFor="taxDefault" className="text-xs text-slate-700 font-medium">Set as default e-service tax</label>
              </div>
              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTaxModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-semibold"
                >
                  Save Tax
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add Promotional Discount</h3>
            <form onSubmit={handleCreateDiscount} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  value={discountForm.code}
                  onChange={(e) => setDiscountForm({ ...discountForm, code: e.target.value })}
                  placeholder="e.g. FESTIVE20"
                  className="w-full px-3 py-2 border rounded-xl text-sm font-mono uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={discountForm.type}
                    onChange={(e) => setDiscountForm({ ...discountForm, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Value</label>
                  <input
                    type="number"
                    required
                    value={discountForm.value}
                    onChange={(e) => setDiscountForm({ ...discountForm, value: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDiscountModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-semibold"
                >
                  Save Discount
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
