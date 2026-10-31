import { Suspense } from 'react';
import { AuthPage } from '../../components/basim/auth-pages';
import { LoadingState } from '../../components/shared/ui';
export default function ForgotPasswordPage() { return <Suspense fallback={<LoadingState />}><AuthPage mode="forgot" /></Suspense>; }