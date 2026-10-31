'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Users, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';

export default function AdminStaffPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [marketingStaff, setMarketingStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'FINANCE',
    phone: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.users.list({ pageSize: 100 });
      const allUsers = Array.isArray(res) ? res : (res?.data || []);
      setUsers(allUsers);
      setCustomers(allUsers.filter((u: any) => u.role === 'CUSTOMER'));
      setMarketingStaff(allUsers.filter((u: any) => u.role === 'MARKETING'));
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await api.users.createStaff(form);
      setSuccess('Staff account created successfully!');
      setShowModal(false);
      setForm({ name: '', email: '', password: '', role: 'FINANCE', phone: '' });
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create staff');
    }
  };

  const handleAssignMarketing = async (customerId: string, marketingId: string) => {
    try {
      await api.users.assignMarketing({ customerId, marketingId });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff & Customer Management</h1>
          <p className="text-sm text-slate-500">Only Administrators can provision staff accounts and assign customer portfolios</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center space-x-1.5"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision Staff User</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Staff Accounts Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Brightloop Internal Staff</h2>
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Staff Name</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">System Role</th>
                  <th className="p-3">Account Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users
                  .filter((u) => u.role !== 'CUSTOMER')
                  .map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-900">{u.name}</td>
                      <td className="p-3 text-slate-600">{u.email}</td>
                      <td className="p-3">
                        <span className="font-mono font-bold px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-800">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                          {u.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Portfolio Assignment */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Customer Portfolio & Marketing Assignments</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3">Customer Account</th>
                <th className="p-3">Email</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Assigned Marketing Rep</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="p-3 font-semibold text-slate-900">{c.name}</td>
                  <td className="p-3 text-slate-600">{c.email}</td>
                  <td className="p-3 text-slate-500">{c.phone || '—'}</td>
                  <td className="p-3">
                    <select
                      value={c.assignedMarketingId || ''}
                      onChange={(e) => handleAssignMarketing(c.id, e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    >
                      <option value="">Unassigned</option>
                      {marketingStaff.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Provision New Staff Account</h3>
            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ramesh@brightloop.local"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                >
                  <option value="FINANCE">Finance Lead</option>
                  <option value="MARKETING">Marketing / Sales Rep</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min 9 chars, upper, lower, special"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
                <span className="text-[11px] text-slate-500">e.g. Staff2026!@#</span>
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
                  Create Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
