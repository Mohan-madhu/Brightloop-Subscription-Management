import { Suspense } from 'react';
import { AuthPage } from '../../components/basim/auth-pages';
import { LoadingState } from '../../components/shared/ui';
export default function LoginPage() { return <Suspense fallback={<LoadingState />}><AuthPage mode="login" /></Suspense>; }