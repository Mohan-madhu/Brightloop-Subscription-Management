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

export function Sidebar({ open = false, onNavigate }: { open?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  const isActive = (path: string) => pathname === path || pathname?.startsWith(`${path}/`);

  return (
    <aside id="primary-sidebar" className={`${open ? 'fixed inset-y-[76px] left-0 z-40 flex w-72 shadow-xl' : 'hidden'} md:sticky md:top-[76px] md:flex md:w-64 md:shadow-none w-64 shrink-0 bg-white text-slate-700 min-h-[calc(100vh-4.75rem)] p-4 flex-col justify-between border-r border-slate-200/80 no-print`}>
      <div className="space-y-6">
        {/* General / Dashboard */}
        <div>
          <div className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Overview
          </div>
          <Link
            href="/odoo/dashboard"
            onClick={onNavigate}
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive('/dashboard') ? 'bg-violet-50 text-violet-800' : 'hover:bg-slate-50 text-slate-600'
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
                onClick={onNavigate}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/admin/products') ? 'bg-violet-50 text-violet-800' : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Products & Variants</span>
              </Link>
              <Link
                href="/odoo/admin/plans"
                onClick={onNavigate}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/admin/plans') ? 'bg-violet-50 text-violet-800' : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Subscription Plans</span>
              </Link>
              <Link
                href="/odoo/admin/staff"
                onClick={onNavigate}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/admin/staff') ? 'bg-violet-50 text-violet-800' : 'hover:bg-slate-50 text-slate-600'
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
                onClick={onNavigate}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/finance/invoices') ? 'bg-violet-50 text-violet-800' : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Invoices & Billing</span>
              </Link>
              <Link
                href="/odoo/finance/kanban"
                onClick={onNavigate}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/finance/kanban') ? 'bg-violet-50 text-violet-800' : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Kanban className="w-4 h-4" />
                <span>Due-Date Kanban</span>
              </Link>
              <Link
                href="/odoo/finance/reports"
                onClick={onNavigate}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/finance/reports') ? 'bg-violet-50 text-violet-800' : 'hover:bg-slate-50 text-slate-600'
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
                onClick={onNavigate}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/marketing/quotations') ? 'bg-violet-50 text-violet-800' : 'hover:bg-slate-50 text-slate-600'
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
                onClick={onNavigate}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/customer/subscriptions') ? 'bg-violet-50 text-violet-800' : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Repeat className="w-4 h-4" />
                <span>My Subscriptions</span>
              </Link>
              <Link
                href="/odoo/customer/invoices"
                onClick={onNavigate}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/customer/invoices') ? 'bg-violet-50 text-violet-800' : 'hover:bg-slate-50 text-slate-600'
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
            onClick={onNavigate}
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive('/offline-drafts') ? 'bg-violet-50 text-violet-800' : 'hover:bg-slate-50 text-slate-600'
            }`}
          >
            <CloudOff className="w-4 h-4" />
            <span>Offline Drafts & Sync</span>
          </Link>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 text-xs text-slate-400 text-center">
        Brightloop v1.0.0
      </div>
    </aside>
  );
}
