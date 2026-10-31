import { Suspense } from 'react';
import { AuthPage } from '../../components/basim/auth-pages';
import { LoadingState } from '../../components/shared/ui';
export default function PasswordResetPage() { return <Suspense fallback={<LoadingState />}><AuthPage mode="reset" /></Suspense>; }