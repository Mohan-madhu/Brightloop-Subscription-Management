import type { ReactNode } from 'react';
import { NajidSessionArea } from '../../features/najid/session-area';
export default function FinanceLayout({ children }: { children: ReactNode }) { return <NajidSessionArea area="finance">{children}</NajidSessionArea>; }
