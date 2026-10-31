import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Brightloop - Subscription & Recurring Billing Management',
  description: 'Enterprise subscription lifecycle, automated recurring billing, payments, and financial analytics.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 min-h-screen text-slate-900 flex flex-col">
        <AuthProvider>
          <Navbar />
          <div className="flex flex-1">
            <Sidebar />
            <main className="flex-1 p-6 md:p-8 overflow-y-auto">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
