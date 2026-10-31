'use client';

import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <Navbar onMenuClick={() => setMenuOpen((open) => !open)} />
      <div className="flex flex-1 min-h-[calc(100vh-4.75rem)]">
        {menuOpen && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-950/30 md:hidden" onClick={() => setMenuOpen(false)} />}
        <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
      </div>
    </>
  );
}
