'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { LogOut, Menu, Wifi, WifiOff } from 'lucide-react';

export function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="min-h-[76px] border-b border-slate-200/80 bg-white/95 px-5 sm:px-8 flex items-center justify-between sticky top-0 z-30 backdrop-blur no-print">
      <div className="flex min-w-0 items-center space-x-3">
        {user && <button type="button" onClick={onMenuClick} aria-label="Open navigation" aria-controls="primary-sidebar" className="md:hidden -ml-2 rounded-xl p-2 text-slate-600 hover:bg-slate-100"><Menu className="h-5 w-5" /></button>}
        <div className="w-10 h-10 rounded-2xl bg-violet-600 flex items-center justify-center text-white font-black text-2xl shadow-md shadow-violet-600/20">
          b
        </div>
        <Link href="/" className="font-extrabold text-xl tracking-tight text-slate-950">
          brightloop
        </Link>
        <span className="hidden sm:inline text-[10px] uppercase tracking-[0.18em] bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full font-bold ml-2">
          Enterprise Billing
        </span>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Network & PWA Offline Indicator */}
        <div className="hidden sm:flex items-center text-xs space-x-1 font-medium">
          {isOnline ? (
            <span className="flex items-center text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <Wifi className="w-3.5 h-3.5 mr-1" /> Online
            </span>
          ) : (
            <span className="flex items-center text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              <WifiOff className="w-3.5 h-3.5 mr-1" /> Offline Mode
            </span>
          )}
        </div>

        {user ? (
          <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200 font-semibold text-xs">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-sm font-semibold text-slate-800 leading-tight">{user.name}</div>
                <div className="text-xs font-mono font-medium text-emerald-600 leading-tight">{user.role}</div>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Link
              href="/login"
              className="px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors shadow-sm shadow-violet-600/20"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
