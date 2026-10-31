'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { CreditCard, CheckCircle, AlertCircle, ShieldCheck, PhoneCall } from 'lucide-react';
import ReminderTriggerModal from '@/components/ReminderTriggerModal';

export default function CustomerInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Razorpay Checkout Modal
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [orderData, setOrderData] = useState<any | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  // Multi-Channel Reminder & IVR Trigger Modal
  const [reminderInvoice, setReminderInvoice] = useState<any | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.invoices.list({ pageSize: 50 });
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
  }, []);

  const handleStartRazorpay = async (inv: any) => {
    setSelectedInvoice(inv);
    setError(null);
    setPaymentSuccess(null);
    try {
      const order = await api.payments.initRazorpay(inv.id);
      setOrderData(order);
      setShowCheckoutModal(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenReminder = (inv: any) => {
    setReminderInvoice(inv);
    setShowReminderModal(true);
  };

  const handleSimulateRazorpaySuccess = async () => {
    if (!selectedInvoice || !orderData) return;
    setVerifying(true);
    try {
      // In Razorpay test mode, we submit the test payment ID to the server verification endpoint
      const fakePaymentId = `pay_test_${Math.random().toString(36).substring(2, 10)}`;
      await api.payments.verifyRazorpay({
        invoiceId: selectedInvoice.id,
        razorpayOrderId: orderData.orderId,
        razorpayPaymentId: fakePaymentId,
        amount: selectedInvoice.outstandingAmount
      });

      setPaymentSuccess(`Payment of ₹${selectedInvoice.outstandingAmount} verified and recorded successfully!`);
      setTimeout(() => {
        setShowCheckoutModal(false);
        loadInvoices();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Payment verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.status !== 'CANCELLED' ? inv.outstandingAmount : 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Invoices & Payments</h1>
        <p className="text-sm text-slate-500">Inspect historical invoices, tax breakdowns, and complete online checkout</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Widget */}
      <div className="bg-emerald-900 text-white rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Total Outstanding Balance</span>
          <div className="text-3xl font-extrabold mt-1">₹{totalOutstanding.toLocaleString()}</div>
        </div>
        <div className="text-xs text-emerald-200">
          Integrated with Razorpay Test Mode Gateway (INR ₹)
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Invoices History</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No invoices generated yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Period</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Paid Amount</th>
                  <th className="p-3">Outstanding</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="p-3 text-slate-500 text-[11px]">
                      {new Date(inv.billingPeriodStart).toLocaleDateString()} - {new Date(inv.billingPeriodEnd).toLocaleDateString()}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900">₹{inv.totalAmount.toLocaleString()}</td>
                    <td className="p-3 font-mono text-emerald-700">₹{inv.paidAmount.toLocaleString()}</td>
                    <td className="p-3 font-mono font-bold text-amber-600">₹{inv.outstandingAmount.toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {inv.outstandingAmount > 0 && inv.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleOpenReminder(inv)}
                            className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs rounded-xl border border-purple-200 shadow-sm transition-colors flex items-center space-x-1"
                            title="Trigger Automated IVR Call & SMS Alert to your Phone"
                          >
                            <PhoneCall className="w-3.5 h-3.5 text-purple-600" />
                            <span>IVR / Remind</span>
                          </button>
                        )}
                        {inv.outstandingAmount > 0 && inv.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleStartRazorpay(inv)}
                            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center space-x-1.5"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pay Now</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Razorpay Test Mode Checkout Modal */}
      {showCheckoutModal && selectedInvoice && orderData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Razorpay Gateway Test Mode</span>
                <h3 className="text-lg font-bold text-slate-900">Complete Invoice Payment</h3>
              </div>
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            </div>

            {paymentSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-emerald-800">{paymentSuccess}</p>
              </div>
            ) : (
              <>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice:</span>
                    <span className="font-mono font-bold text-slate-800">{selectedInvoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Order ID:</span>
                    <span className="font-mono text-slate-700">{orderData.orderId}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-sm">
                    <span className="text-slate-900">Payable Amount:</span>
                    <span className="font-mono text-emerald-700">₹{selectedInvoice.outstandingAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-800">
                  This checkout is running in Razorpay Test Mode. Clicking "Authorize Test Payment" verifies the transaction server-side and settles the invoice.
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCheckoutModal(false)}
                    className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={verifying}
                    onClick={handleSimulateRazorpaySuccess}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center space-x-2"
                  >
                    {verifying ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>Authorize Test Payment</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
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
