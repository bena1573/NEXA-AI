'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { apiRequest } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/field';

export type WorkspaceOption = { id: string; name: string };

export function Topbar({
    businesses,
    activeBusinessId,
    userName,
    roleLabel,
    demoMode,
}: {
    businesses: WorkspaceOption[];
    activeBusinessId: string;
    userName: string;
    roleLabel: string;
    demoMode: boolean;
}) {
    const router = useRouter();
    const [switching, setSwitching] = useState(false);

    async function switchBusiness(businessId: string) {
        setSwitching(true);
        await apiRequest('/api/businesses/active', { body: { businessId } });
        setSwitching(false);
        router.refresh();
    }

    async function signOut() {
        await apiRequest('/api/auth/logout', { body: {} });
        router.replace('/login');
    }

    return (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 lg:px-6">
            <div className="flex items-center gap-3">
                {businesses.length > 1
                    ? (
                        <>
                            <label htmlFor="workspace" className="sr-only">Workspace</label>
                            <Select
                                id="workspace"
                                value={activeBusinessId}
                                disabled={switching}
                                onChange={event => switchBusiness(event.target.value)}
                                className="w-48"
                            >
                                {businesses.map(business => (
                                    <option key={business.id} value={business.id}>{business.name}</option>
                                ))}
                            </Select>
                        </>
                    )
                    : <p className="font-medium">{businesses[0]?.name}</p>}
                {demoMode && <Badge tone="accent">Demo mode</Badge>}
            </div>

            <div className="flex items-center gap-3">
                <span className="text-sm text-muted">
                    {userName} · {roleLabel}
                </span>
                <Button variant="secondary" size="sm" onClick={signOut}>
                    <LogOut aria-hidden className="h-4 w-4" />
                    Sign out
                </Button>
            </div>
        </header>
    );
}
