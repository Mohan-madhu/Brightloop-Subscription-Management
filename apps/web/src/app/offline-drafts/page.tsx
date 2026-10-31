'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { CloudOff, RefreshCw, Plus, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react';

interface OfflineDraft {
  id: string;
  clientName: string;
  customerId?: string;
  productId: string;
  planId?: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  savedAt: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
}

export default function OfflineDraftsPage() {
  const [drafts, setDrafts] = useState<OfflineDraft[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form
  const [form, setForm] = useState({
    clientName: '',
    customerId: '',
    productId: '',
    quantity: 1,
    unitPrice: 5000,
    notes: ''
  });

  const loadLocalDrafts = () => {
    const raw = localStorage.getItem('brightloop_offline_drafts');
    if (raw) {
      try {
        setDrafts(JSON.parse(raw));
      } catch (e) {
        setDrafts([]);
      }
    }
  };

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    loadLocalDrafts();

    // If online, load available customers and products for cached selection
    if (navigator.onLine) {
      api.users.list({ role: 'CUSTOMER' }).then((res) => setCustomers(Array.isArray(res) ? res : (res?.data || []))).catch(() => {});
      api.products.list().then((res) => setProducts(Array.isArray(res) ? res : (res?.data || []))).catch(() => {});
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    const newDraft: OfflineDraft = {
      id: `draft_${Date.now()}`,
      clientName: form.clientName,
      customerId: form.customerId,
      productId: form.productId,
      quantity: form.quantity,
      unitPrice: form.unitPrice,
      notes: form.notes,
      savedAt: new Date().toISOString(),
      syncStatus: 'PENDING'
    };

    const updated = [newDraft, ...drafts];
    setDrafts(updated);
    localStorage.setItem('brightloop_offline_drafts', JSON.stringify(updated));
    setShowModal(false);
    setForm({ clientName: '', customerId: '', productId: '', quantity: 1, unitPrice: 5000, notes: '' });
  };

  const handleSyncAll = async () => {
    if (!navigator.onLine) {
      alert('Cannot sync while offline. Please connect to internet first.');
      return;
    }

    setSyncing(true);
    const updatedDrafts = [...drafts];

    for (let i = 0; i < updatedDrafts.length; i++) {
      const d = updatedDrafts[i];
      if (d.syncStatus === 'PENDING' && d.customerId && d.productId) {
        try {
          await api.quotations.create({
            customerId: d.customerId,
            lines: [
              {
                productId: d.productId,
                quantity: d.quantity,
                salesPrice: d.unitPrice,
                description: `Offline Synchronized: ${d.notes || 'Proposal'}`
              }
            ]
          });
          d.syncStatus = 'SYNCED';
        } catch (err) {
          d.syncStatus = 'FAILED';
        }
      }
    }

    setDrafts(updatedDrafts);
    localStorage.setItem('brightloop_offline_drafts', JSON.stringify(updatedDrafts));
    setSyncing(false);
  };

  const clearSynced = () => {
    const remaining = drafts.filter((d) => d.syncStatus !== 'SYNCED');
    setDrafts(remaining);
    localStorage.setItem('brightloop_offline_drafts', JSON.stringify(remaining));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Offline Quotation Workspace</h1>
          <p className="text-sm text-slate-500">Draft proposals without an active connection and synchronize to server when online</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={clearSynced}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors border border-slate-300"
          >
            Clear Synced
          </button>
          <button
            onClick={handleSyncAll}
            disabled={syncing || !isOnline}
            className={`px-4 py-2 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center space-x-1.5 ${
              isOnline && !syncing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-400 cursor-not-allowed'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>Sync to Server</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Draft Offline Quote</span>
          </button>
        </div>
      </div>

      {/* Network Status & Boundaries Banner */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between ${
        isOnline ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
      }`}>
        <div className="flex items-center space-x-3 text-xs">
          {isOnline ? <Wifi className="w-5 h-5 text-emerald-600" /> : <WifiOff className="w-5 h-5 text-amber-600" />}
          <div>
            <span className="font-bold">{isOnline ? 'Connected to Brightloop Cloud' : 'Offline Mode Active'}</span>
            <p className="text-[11px] opacity-80 mt-0.5">
              Offline mode permits client-side proposal drafting. Authoritative operations (invoice confirmation, payments, subscription changes) strictly require live server confirmation.
            </p>
          </div>
        </div>
      </div>

      {/* Drafts List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Local Quotation Drafts</h2>
        {drafts.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No local drafts found. Click "Draft Offline Quote" to create an offline proposal.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Client / Prospect</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">Unit Price</th>
                  <th className="p-3">Saved Timestamp</th>
                  <th className="p-3">Sync Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drafts.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-900">{d.clientName}</td>
                    <td className="p-3">{d.quantity}</td>
                    <td className="p-3 font-mono">₹{d.unitPrice.toLocaleString()}</td>
                    <td className="p-3 text-slate-500">{new Date(d.savedAt).toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                        d.syncStatus === 'SYNCED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : d.syncStatus === 'FAILED'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {d.syncStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Offline Draft Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">New Offline Quotation Draft</h3>
            <form onSubmit={saveDraft} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Client Name</label>
                <input
                  type="text"
                  required
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  placeholder="e.g. Neo Technologies"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              {customers.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Link to Known Customer</label>
                  <select
                    value={form.customerId}
                    onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  >
                    <option value="">Select Customer (for sync)</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {products.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Product</label>
                  <select
                    value={form.productId}
                    onChange={(e) => setForm({ ...form, productId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  >
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={form.unitPrice}
                    onChange={(e) => setForm({ ...form, unitPrice: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Additional terms or details"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                  rows={2}
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
                  Save to Local Storage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
