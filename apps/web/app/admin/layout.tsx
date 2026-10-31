import type { ReactNode } from 'react';
import { ProtectedArea } from '../../components/shared/protected-area';

const navigation = [
  { label: 'Admin overview', href: '/admin', roles: ['ADMIN'] },
  { label: 'Staff access', href: '/admin/staff', roles: ['ADMIN'] },
  { label: 'Products', href: '/admin/products', roles: ['ADMIN'] },
  { label: 'Plans', href: '/admin/plans', roles: ['ADMIN'] },
  { label: 'Tax rules', href: '/admin/taxes', roles: ['ADMIN'] },
  { label: 'Discounts', href: '/admin/discounts', roles: ['ADMIN'] },
  { label: 'Offline drafts', href: '/offline-drafts', roles: ['ADMIN'] },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <ProtectedArea roles={['ADMIN']} navigation={navigation}>{children}</ProtectedArea>;
}
