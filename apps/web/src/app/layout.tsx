import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { WorkspaceShell } from '@/components/WorkspaceShell';

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
      <body className="bg-[#f7f7fc] min-h-screen text-slate-900 flex flex-col antialiased">
        <AuthProvider>
          <WorkspaceShell>{children}</WorkspaceShell>
        </AuthProvider>
      </body>
    </html>
  );
}
