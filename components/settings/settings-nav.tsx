'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Action } from '@/lib/auth/permissions';
import { cn } from '@/lib/utils';

const TABS: Array<{ href: string; label: string; requires: Action }> = [
    { href: '/dashboard/settings', label: 'Business', requires: 'business:read' },
    { href: '/dashboard/settings/agent', label: 'AI agent', requires: 'agent:read' },
    { href: '/dashboard/settings/services', label: 'Services', requires: 'business:read' },
    { href: '/dashboard/settings/team', label: 'Team', requires: 'team:read' },
    { href: '/dashboard/settings/security', label: 'Security', requires: 'business:read' },
    { href: '/dashboard/settings/billing', label: 'Billing & usage', requires: 'billing:read' },
];

export function SettingsNav({ allowed }: { allowed: Action[] }) {
    const pathname = usePathname();

    return (
        <nav aria-label="Settings sections" className="flex flex-wrap gap-1 border-b border-border pb-2">
            {TABS.filter(tab => allowed.includes(tab.requires)).map(tab => {
                const active = pathname === tab.href;
                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                            'rounded-md px-3 py-1.5 text-sm',
                            active ? 'bg-primary/15 text-primary' : 'text-muted hover:text-foreground',
                        )}
                    >
                        {tab.label}
                    </Link>
                );
            })}
        </nav>
    );
}
