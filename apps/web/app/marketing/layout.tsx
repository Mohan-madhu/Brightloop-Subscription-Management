import type { ReactNode } from 'react';
import { ProtectedArea } from '../../components/shared/protected-area';

const navigation = [
  { label: 'Assigned customers', href: '/marketing/customers', roles: ['ADMIN', 'MARKETING'] },
  { label: 'Offline drafts', href: '/offline-drafts', roles: ['ADMIN', 'MARKETING'] },
];

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <ProtectedArea roles={['ADMIN', 'MARKETING']} navigation={navigation}>{children}</ProtectedArea>;
}
