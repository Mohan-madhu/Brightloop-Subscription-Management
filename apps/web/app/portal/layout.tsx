import type { ReactNode } from 'react';
import { NajidSessionArea } from '../../features/najid/session-area';
export default function CustomerPortalLayout({ children }: { children: ReactNode }) { return <NajidSessionArea area="customer">{children}</NajidSessionArea>; }
