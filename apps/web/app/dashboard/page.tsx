'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingState } from '../../components/shared/ui';
import { useSession } from '../../lib/session';

export default function DashboardAliasPage() {
  const session = useSession(); const router = useRouter();
  useEffect(() => {
    if (session.status !== 'authenticated' || !session.user) return;
    if (session.user.roles.includes('CUSTOMER')) router.replace('/portal');
    else if (session.user.roles.includes('MARKETING')) router.replace('/marketing/customers');
    else router.replace('/finance');
  }, [router, session.status, session.user]);
  return <main className="mx-auto max-w-2xl p-8"><LoadingState label="Opening your Brightloop dashboard…" /></main>;
}
