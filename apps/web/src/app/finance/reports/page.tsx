'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { BarChart3, Plus, Calendar, DollarSign, AlertCircle } from 'lucide-react';

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [quarter, setQuarter] = useState('Q1');
  const [year, setYear] = useState(2026);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reps, met] = await Promise.all([
        api.reports.listQuarterly(),
        api.reports.getDashboard()
      ]);
      setReports(reps || []);
      setMetrics(met);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      await api.reports.createQuarterly({ quarter, year });
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financial Analytics & Quarterly Reporting</h1>
          <p className="text-sm text-slate-500">Official snapshot reporting for board review, auditing, and tax compliance</p>
        </div>

        {/* Generate Quarterly Report Form */}
        <form onSubmit={handleGenerate} className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm text-xs">
          <select
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold"
          >
            <option value="Q1">Q1 (Apr - Jun)</option>
            <option value="Q2">Q2 (Jul - Sep)</option>
            <option value="Q3">Q3 (Oct - Dec)</option>
            <option value="Q4">Q4 (Jan - Mar)</option>
          </select>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg font-bold text-center"
          />
          <button
            type="submit"
            disabled={generating}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
          >
            {generating ? 'Generating...' : 'Generate Report'}
          </button>
        </form>
      </div>

      {/* Snapshot Cards */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase">Gross Invoiced (YTD)</span>
            <div className="text-2xl font-extrabold text-slate-900">₹{metrics.invoicedRevenue.toLocaleString()}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase">Cash Collected (YTD)</span>
            <div className="text-2xl font-extrabold text-emerald-600">₹{metrics.collectedRevenue.toLocaleString()}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Receivables</span>
            <div className="text-2xl font-extrabold text-amber-600">₹{metrics.outstandingBalance.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Historical Quarterly Reports */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Generated Quarterly Reports Archive</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No quarterly reports generated yet. Use the form above to generate your first financial snapshot.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Period</th>
                  <th className="p-3">Invoiced Volume</th>
                  <th className="p-3">Collected Revenue</th>
                  <th className="p-3">Outstanding Balance</th>
                  <th className="p-3">Active Subscriptions</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-900">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {r.quarter} {r.year}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900">₹{r.totalInvoiced.toLocaleString()}</td>
                    <td className="p-3 font-mono text-emerald-700">₹{r.totalCollected.toLocaleString()}</td>
                    <td className="p-3 font-mono font-bold text-amber-600">₹{r.totalOutstanding.toLocaleString()}</td>
                    <td className="p-3 font-mono">{r.activeSubscriptions}</td>
                    <td className="p-3 text-slate-500">{new Date(r.generatedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
