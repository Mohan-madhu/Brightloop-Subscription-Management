'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '../../lib/session';
import { AppShell, type AppNavigationItem } from './app-shell';
import { Button, ErrorState, LoadingState } from './ui';

export function ProtectedArea({ children, roles, navigation }: {
  children: ReactNode;
  roles: readonly string[];
  navigation: readonly AppNavigationItem[];
}) {
  const { status, user, error, refresh, logout } = useSession();
  const [logoutError, setLogoutError] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [pathname, router, status]);

  useEffect(() => {
    const handleUnauthorized = () => router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    window.addEventListener('brightloop:unauthenticated', handleUnauthorized);
    return () => window.removeEventListener('brightloop:unauthenticated', handleUnauthorized);
  }, [pathname, router]);

  if (status === 'loading') return <main className="mx-auto max-w-3xl p-6"><LoadingState label="Checking your session…" /></main>;
  if (status === 'error') return <main className="mx-auto max-w-3xl p-6"><ErrorState message={error?.message ?? 'Session could not be checked.'} retry={() => void refresh()} /></main>;
  if (status === 'unauthenticated') return <main className="mx-auto max-w-3xl p-6"><LoadingState label="Taking you to sign in…" /></main>;
  if (!user || !user.roles.some((role) => roles.includes(role))) return <main className="mx-auto max-w-3xl p-6"><h1 className="text-xl font-semibold">Access denied</h1><p className="mt-2 text-sm text-slate-600">Your account does not have access to this area.</p><Button className="mt-4" variant="secondary" onClick={() => router.replace('/')}>Return to home</Button></main>;

  return <AppShell user={user} navigation={navigation} onLogout={async () => { setLogoutError(''); try { await logout(); router.replace('/login'); } catch (cause) { setLogoutError(cause instanceof Error ? cause.message : 'Sign out failed.'); } }}><div className="mx-auto w-full max-w-6xl">{logoutError && <div className="mb-4"><ErrorState message={logoutError} /></div>}{children}</div></AppShell>;
}