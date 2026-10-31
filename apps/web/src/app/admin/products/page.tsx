'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Package, Plus, Layers, AlertCircle, Check } from 'lucide-react';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [addOns, setAddOns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [showAddOnModal, setShowAddOnModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Form states
  const [prodForm, setProdForm] = useState({ name: '', description: '', salesPrice: 1000, costPrice: 400 });
  const [variantForm, setVariantForm] = useState({ name: '', sku: '', priceAdjustment: 560 });
  const [addOnForm, setAddOnForm] = useState({ name: '', description: '', price: 950 });

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, adds] = await Promise.all([
        api.products.list(),
        api.addOns.list()
      ]);
      setProducts(prods || []);
      setAddOns(adds || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.products.create(prodForm);
      setShowProductModal(false);
      setProdForm({ name: '', description: '', salesPrice: 1000, costPrice: 400 });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;
    try {
      await api.products.createVariant({
        productId: selectedProductId,
        ...variantForm
      });
      setShowVariantModal(false);
      setVariantForm({ name: '', sku: '', priceAdjustment: 560 });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateAddOn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addOns.create(addOnForm);
      setShowAddOnModal(false);
      setAddOnForm({ name: '', description: '', price: 950 });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products, Variants & Add-Ons</h1>
          <p className="text-sm text-slate-500">Configure base products, price-adjusting variants, and optional add-ons</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddOnModal(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors border border-slate-300"
          >
            + New Add-On
          </button>
          <button
            onClick={() => setShowProductModal(true)}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Product</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Products Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Products & Variants</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-slate-500 bg-white border border-slate-200 rounded-2xl">
            No products found. Create one using the button above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {products.map((prod) => (
              <div key={prod.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{prod.name}</h3>
                    <p className="text-xs text-slate-500">{prod.description || 'No description provided'}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                    {prod.status}
                  </span>
                </div>

                <div className="flex items-center space-x-4 text-xs font-semibold text-slate-700 bg-slate-50 p-2.5 rounded-xl">
                  <div>Base Price: ₹{prod.salesPrice.toLocaleString()}</div>
                  {prod.costPrice !== undefined && (
                    <div className="text-slate-500">Cost: ₹{prod.costPrice.toLocaleString()}</div>
                  )}
                </div>

                {/* Variants List */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Configured Variants</span>
                    <button
                      onClick={() => {
                        setSelectedProductId(prod.id);
                        setShowVariantModal(true);
                      }}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                    >
                      + Add Variant
                    </button>
                  </div>

                  {prod.variants && prod.variants.length > 0 ? (
                    <div className="space-y-1.5">
                      {prod.variants.map((v: any) => (
                        <div key={v.id} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                          <span className="font-medium text-slate-800">{v.name}</span>
                          <span className="font-mono text-emerald-700 font-semibold">
                            {v.priceAdjustment >= 0 ? `+₹${v.priceAdjustment}` : `-₹${Math.abs(v.priceAdjustment)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">No variants yet.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add-Ons Section */}
      <div className="space-y-4 pt-6">
        <h2 className="text-lg font-bold text-slate-900">Optional Add-Ons</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {addOns.map((add) => (
            <div key={add.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-1.5">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm text-slate-900">{add.name}</h4>
                <span className="font-bold text-xs text-emerald-600 font-mono">₹{add.price}</span>
              </div>
              <p className="text-xs text-slate-500">{add.description || 'Optional service add-on'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Create Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Create New Product</h3>
            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={prodForm.name}
                  onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                  placeholder="e.g. Brightloop ERP Cloud"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  value={prodForm.description}
                  onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sales Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={prodForm.salesPrice}
                    onChange={(e) => setProdForm({ ...prodForm, salesPrice: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    value={prodForm.costPrice}
                    onChange={(e) => setProdForm({ ...prodForm, costPrice: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-semibold"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Variant Modal */}
      {showVariantModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add Product Variant</h3>
            <form onSubmit={handleCreateVariant} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Variant Name</label>
                <input
                  type="text"
                  required
                  value={variantForm.name}
                  onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                  placeholder="e.g. Odoo Integration Edition"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">SKU</label>
                <input
                  type="text"
                  value={variantForm.sku}
                  onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                  placeholder="ERP-ODOO"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Price Adjustment (₹)</label>
                <input
                  type="number"
                  required
                  value={variantForm.priceAdjustment}
                  onChange={(e) => setVariantForm({ ...variantForm, priceAdjustment: parseFloat(e.target.value) })}
                  placeholder="560"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
                <span className="text-[11px] text-slate-500">Amount added to or subtracted from product base price.</span>
              </div>
              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowVariantModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-semibold"
                >
                  Save Variant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Add-On Modal */}
      {showAddOnModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Create New Add-On</h3>
            <form onSubmit={handleCreateAddOn} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Add-On Name</label>
                <input
                  type="text"
                  required
                  value={addOnForm.name}
                  onChange={(e) => setAddOnForm({ ...addOnForm, name: e.target.value })}
                  placeholder="e.g. 24/7 SLA Priority Support"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Price (₹)</label>
                <input
                  type="number"
                  required
                  value={addOnForm.price}
                  onChange={(e) => setAddOnForm({ ...addOnForm, price: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  value={addOnForm.description}
                  onChange={(e) => setAddOnForm({ ...addOnForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                  rows={2}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddOnModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-semibold"
                >
                  Save Add-On
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
