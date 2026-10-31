'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Package,
  Layers,
  FileText,
  CreditCard,
  Kanban,
  BarChart3,
  Users,
  Repeat,
  CloudOff,
  Tag
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  const isActive = (path: string) => pathname === path || pathname?.startsWith(`${path}/`);

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between no-print">
      <div className="space-y-6">
        {/* General / Dashboard */}
        <div>
          <div className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Overview
          </div>
          <Link
            href="/odoo/dashboard"
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive('/dashboard') ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
        </div>

        {/* Admin Navigation */}
        {user.role === 'ADMIN' && (
          <div>
            <div className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Administration
            </div>
            <div className="space-y-1">
              <Link
                href="/odoo/admin/products"
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/admin/products') ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Products & Variants</span>
              </Link>
              <Link
                href="/odoo/admin/plans"
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/admin/plans') ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Subscription Plans</span>
              </Link>
              <Link
                href="/odoo/admin/staff"
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/admin/staff') ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Staff & Customer Mgmt</span>
              </Link>
            </div>
          </div>
        )}

        {/* Finance Navigation */}
        {(user.role === 'FINANCE' || user.role === 'ADMIN') && (
          <div>
            <div className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Finance & Billing
            </div>
            <div className="space-y-1">
              <Link
                href="/odoo/finance/invoices"
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/finance/invoices') ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Invoices & Billing</span>
              </Link>
              <Link
                href="/odoo/finance/kanban"
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/finance/kanban') ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Kanban className="w-4 h-4" />
                <span>Due-Date Kanban</span>
              </Link>
              <Link
                href="/odoo/finance/reports"
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/finance/reports') ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Quarterly Reports</span>
              </Link>
            </div>
          </div>
        )}

        {/* Marketing Navigation */}
        {(user.role === 'MARKETING' || user.role === 'ADMIN') && (
          <div>
            <div className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Sales & Marketing
            </div>
            <div className="space-y-1">
              <Link
                href="/odoo/marketing/quotations"
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/marketing/quotations') ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Quotations</span>
              </Link>
            </div>
          </div>
        )}

        {/* Customer Portal Navigation */}
        {user.role === 'CUSTOMER' && (
          <div>
            <div className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Customer Portal
            </div>
            <div className="space-y-1">
              <Link
                href="/odoo/customer/subscriptions"
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/customer/subscriptions') ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Repeat className="w-4 h-4" />
                <span>My Subscriptions</span>
              </Link>
              <Link
                href="/odoo/customer/invoices"
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/customer/invoices') ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>My Invoices & Pay</span>
              </Link>
            </div>
          </div>
        )}

        {/* Offline Drafts & PWA */}
        <div>
          <div className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Offline Capabilities
          </div>
          <Link
            href="/odoo/offline-drafts"
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive('/offline-drafts') ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <CloudOff className="w-4 h-4" />
            <span>Offline Drafts & Sync</span>
          </Link>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 text-center">
        Brightloop v1.0.0
      </div>
    </aside>
  );
}
