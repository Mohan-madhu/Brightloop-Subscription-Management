'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  FileText,
  CheckCircle,
  XCircle,
  CreditCard,
  Printer,
  AlertCircle,
  Search,
  Filter,
  PhoneCall,
  Sparkles
} from 'lucide-react';
import ReminderTriggerModal from '@/components/ReminderTriggerModal';

export default function FinanceInvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payNotes, setPayNotes] = useState('');

  // Multi-Channel Reminder & IVR Trigger Modal
  const [reminderInvoice, setReminderInvoice] = useState<any | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [batchTriggering, setBatchTriggering] = useState(false);
  const [batchNotice, setBatchNotice] = useState<string | null>(null);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.invoices.list({
        status: statusFilter || undefined,
        pageSize: 50
      });
      const invoiceList = Array.isArray(res) ? res : (res?.data || []);
      setInvoices(invoiceList);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [statusFilter]);

  const handleConfirm = async (id: string) => {
    if (!confirm('Confirm and lock invoice snapshot? This will consume any reserved discounts.')) return;
    try {
      await api.invoices.confirm(id);
      loadInvoices();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel invoice? Any reserved discount will be released.')) return;
    try {
      await api.invoices.cancel(id);
      loadInvoices();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenPay = (inv: any) => {
    setSelectedInvoice(inv);
    setPayAmount(inv.outstandingAmount);
    setPayNotes('Manual payment recorded by Finance');
    setShowPayModal(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    try {
      await api.payments.manual({
        invoiceId: selectedInvoice.id,
        amount: payAmount,
        notes: payNotes,
        paymentMethod: 'MANUAL'
      });
      setShowPayModal(false);
      loadInvoices();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenPrint = async (inv: any) => {
    try {
      const full = await api.invoices.get(inv.id);
      setSelectedInvoice(full);
      setShowPrintModal(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenReminder = (inv: any) => {
    setReminderInvoice(inv);
    setShowReminderModal(true);
  };

  const handleBatchTrigger = async () => {
    if (!confirm('Dispatch automated IVR calls, SMS and Email payment reminders to all due and overdue invoices?')) return;
    setBatchTriggering(true);
    setBatchNotice(null);
    try {
      const res = await api.reminders.batch({ daysThreshold: 7 });
      setBatchNotice(`Batch reminders dispatched to ${res.processed || 0} eligible invoice accounts!`);
      setTimeout(() => setBatchNotice(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch batch reminders');
    } finally {
      setBatchTriggering(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices & Financial Management</h1>
          <p className="text-sm text-slate-500">
            Confirm draft recurring invoices, register partial/full manual payments, and inspect tax snapshots
          </p>
        </div>

        {/* Actions & Filter */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleBatchTrigger}
            disabled={batchTriggering}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center space-x-1.5"
            title="Dispatch IVR Calls, SMS and Email payment reminders to all due invoices"
          >
            {batchTriggering ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-purple-200" />
            )}
            <span>Batch IVR/Reminders</span>
          </button>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-medium"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {batchNotice && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-800 font-semibold flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <span>{batchNotice}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Issued & Scheduled Invoices</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No invoices found for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Paid Amount</th>
                  <th className="p-3">Outstanding</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-800">{inv.customer?.name}</div>
                      <div className="text-[11px] text-slate-500">{inv.customer?.email}</div>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900">₹{inv.totalAmount.toLocaleString()}</td>
                    <td className="p-3 font-mono text-emerald-700">₹{inv.paidAmount.toLocaleString()}</td>
                    <td className="p-3 font-mono font-bold text-amber-600">₹{inv.outstandingAmount.toLocaleString()}</td>
                    <td className="p-3 text-slate-500">{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : inv.status === 'CONFIRMED'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : inv.status === 'DRAFT'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-1">
                      {/* Confirm button */}
                      {inv.status === 'DRAFT' && (
                        <button
                          onClick={() => handleConfirm(inv.id)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg border border-emerald-200"
                        >
                          Confirm
                        </button>
                      )}

                      {/* Pay button */}
                      {inv.outstandingAmount > 0 && inv.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleOpenPay(inv)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg border border-blue-200"
                        >
                          Record Pay
                        </button>
                      )}

                      {/* Multi-Channel Reminder & IVR Trigger button */}
                      {inv.outstandingAmount > 0 && inv.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleOpenReminder(inv)}
                          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold rounded-lg border border-purple-200 inline-flex items-center space-x-1"
                          title="Trigger IVR Voice Call, SMS and Email Reminders"
                        >
                          <PhoneCall className="w-3 h-3 text-purple-600" />
                          <span>IVR / Remind</span>
                        </button>
                      )}

                      {/* Cancel button */}
                      {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleCancel(inv.id)}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg border border-red-200"
                        >
                          Cancel
                        </button>
                      )}

                      {/* Print view button */}
                      <button
                        onClick={() => handleOpenPrint(inv)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                        title="Print / View Invoice"
                      >
                        <Printer className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Payment Modal */}
      {showPayModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Record Payment</h3>
            <div className="bg-slate-50 p-3 rounded-xl space-y-1 text-xs text-slate-600">
              <div>Invoice: <span className="font-mono font-bold text-slate-900">{selectedInvoice.invoiceNumber}</span></div>
              <div>Customer: <span className="font-semibold text-slate-900">{selectedInvoice.customer?.name}</span></div>
              <div>Current Outstanding: <span className="font-mono font-bold text-amber-600">₹{selectedInvoice.outstandingAmount}</span></div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedInvoice.outstandingAmount}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl text-sm font-mono font-bold"
                />
                <span className="text-[11px] text-slate-500">Supports partial payments up to outstanding balance.</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Transaction Reference</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Bank Transfer Ref #99213"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print-Friendly Invoice Modal */}
      {showPrintModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl space-y-6">
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">BRIGHTLOOP</h2>
                <p className="text-xs text-slate-500">Tax Invoice / Bill of Supply</p>
                <div className="text-xs font-mono text-slate-700 mt-2 font-bold">
                  {selectedInvoice.invoiceNumber}
                </div>
              </div>
              <div className="text-right text-xs text-slate-500 space-y-1">
                <div>Date: {new Date(selectedInvoice.createdAt).toLocaleDateString()}</div>
                <div>Due Date: {new Date(selectedInvoice.dueDate).toLocaleDateString()}</div>
                <div className="font-semibold text-emerald-700 uppercase">{selectedInvoice.status}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs text-slate-700">
              <div className="space-y-1">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">Billed To:</span>
                <div className="font-bold text-slate-900">{selectedInvoice.customer?.name}</div>
                <div>{selectedInvoice.customer?.email}</div>
                <div>{selectedInvoice.customer?.phone || 'No phone provided'}</div>
              </div>
              <div className="space-y-1 text-right">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">Issued By:</span>
                <div className="font-bold text-slate-900">Brightloop Software Ltd</div>
                <div>Billing & E-Services Division</div>
                <div>GST Rate: 18% (Tax-Exclusive)</div>
              </div>
            </div>

            {/* Snapshot Line Items */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <tr>
                    <th className="p-2.5">Item Description</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Unit Price</th>
                    <th className="p-2.5 text-right">Tax (18%)</th>
                    <th className="p-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.lines?.map((l: any) => (
                    <tr key={l.id}>
                      <td className="p-2.5 font-medium text-slate-800">{l.description}</td>
                      <td className="p-2.5 text-center">{l.quantity}</td>
                      <td className="p-2.5 text-right font-mono">₹{l.unitPrice}</td>
                      <td className="p-2.5 text-right font-mono text-slate-500">₹{l.taxAmount}</td>
                      <td className="p-2.5 text-right font-mono font-semibold">₹{l.subtotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{selectedInvoice.subtotal.toLocaleString()}</span>
                </div>
                {selectedInvoice.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span className="font-mono">-₹{selectedInvoice.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>GST (18%):</span>
                  <span className="font-mono">₹{selectedInvoice.taxAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2 text-sm">
                  <span>Grand Total:</span>
                  <span className="font-mono">₹{selectedInvoice.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Paid to Date:</span>
                  <span className="font-mono">₹{selectedInvoice.paidAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-600 border-t border-slate-100 pt-1">
                  <span>Balance Due:</span>
                  <span className="font-mono">₹{selectedInvoice.outstandingAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 no-print">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-700"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Channel Reminder & IVR Trigger Modal */}
      {showReminderModal && reminderInvoice && (
        <ReminderTriggerModal
          invoice={reminderInvoice}
          isOpen={showReminderModal}
          onClose={() => {
            setShowReminderModal(false);
            setReminderInvoice(null);
          }}
          onSuccess={() => {
            loadInvoices();
          }}
        />
      )}
    </div>
  );
}
