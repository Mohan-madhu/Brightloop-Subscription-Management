'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Kanban, AlertTriangle, Clock, Calendar, CheckCircle } from 'lucide-react';

export default function DueDateKanbanPage() {
  const [kanban, setKanban] = useState<any>({
    overdue: [],
    dueSoon: [],
    dueMonth: [],
    dueLater: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.reports.getKanban()
      .then((data) => setKanban(data))
      .catch(() => setKanban({ overdue: [], dueSoon: [], dueMonth: [], dueLater: [] }))
      .finally(() => setLoading(false));
  }, []);

  const renderCard = (inv: any, urgent = false) => (
    <div
      key={inv.id}
      className={`p-4 rounded-xl border bg-white shadow-sm space-y-2 text-xs transition-shadow hover:shadow-md ${
        urgent ? 'border-red-200 bg-red-50/20' : 'border-slate-200'
      }`}
    >
      <div className="flex justify-between items-start">
        <span className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</span>
        <span className="font-mono font-bold text-slate-900">₹{inv.outstandingAmount.toLocaleString()}</span>
      </div>
      <div className="font-semibold text-slate-800">{inv.customer?.name}</div>
      <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1 border-t border-slate-100">
        <span>Due: {new Date(inv.dueDate).toLocaleDateString()}</span>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
          inv.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
        }`}>
          {inv.status}
        </span>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Invoice Due-Date Kanban</h1>
        <p className="text-sm text-slate-500">Aging workflow derived from due dates, payment status, and outstanding balances</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Overdue */}
          <div className="bg-red-50/50 border border-red-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between font-bold text-xs text-red-800 uppercase tracking-wider">
              <span className="flex items-center space-x-1">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>Overdue</span>
              </span>
              <span className="bg-red-200 text-red-900 px-2 py-0.5 rounded-full font-bold">
                {kanban.overdue.length}
              </span>
            </div>
            <div className="space-y-2.5">
              {kanban.overdue.map((i: any) => renderCard(i, true))}
              {kanban.overdue.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs italic">No overdue invoices</div>
              )}
            </div>
          </div>

          {/* Due Soon (0 - 7 Days) */}
          <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between font-bold text-xs text-amber-800 uppercase tracking-wider">
              <span className="flex items-center space-x-1">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Due in 7 Days</span>
              </span>
              <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                {kanban.dueSoon.length}
              </span>
            </div>
            <div className="space-y-2.5">
              {kanban.dueSoon.map((i: any) => renderCard(i))}
              {kanban.dueSoon.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs italic">No invoices due this week</div>
              )}
            </div>
          </div>

          {/* Due Month (7 - 30 Days) */}
          <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between font-bold text-xs text-blue-800 uppercase tracking-wider">
              <span className="flex items-center space-x-1">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Due in 30 Days</span>
              </span>
              <span className="bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full font-bold">
                {kanban.dueMonth.length}
              </span>
            </div>
            <div className="space-y-2.5">
              {kanban.dueMonth.map((i: any) => renderCard(i))}
              {kanban.dueMonth.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs italic">No invoices in this bracket</div>
              )}
            </div>
          </div>

          {/* Due Later (> 30 Days) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between font-bold text-xs text-slate-700 uppercase tracking-wider">
              <span className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-slate-500" />
                <span>Future / Later</span>
              </span>
              <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full font-bold">
                {kanban.dueLater.length}
              </span>
            </div>
            <div className="space-y-2.5">
              {kanban.dueLater.map((i: any) => renderCard(i))}
              {kanban.dueLater.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs italic">No future invoices</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
