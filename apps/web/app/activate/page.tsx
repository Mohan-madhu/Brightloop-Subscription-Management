import { Suspense } from 'react';
import { AuthPage } from '../../components/basim/auth-pages';
import { LoadingState } from '../../components/shared/ui';
export default function ActivatePage() { return <Suspense fallback={<LoadingState />}><AuthPage mode="activate" /></Suspense>; }