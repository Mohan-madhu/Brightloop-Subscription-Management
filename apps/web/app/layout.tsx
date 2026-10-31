import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '../components/shared/app-providers';
export const metadata: Metadata = { title: 'Brightloop', description: 'Subscription management' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><AppProviders>{children}</AppProviders></body></html>; }
