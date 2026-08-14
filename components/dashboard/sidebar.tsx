'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, Sparkles, X } from 'lucide-react';
import type { Action } from '@/lib/auth/permissions';
import { NAV_SECTIONS } from '@/components/dashboard/nav';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Sidebar({ allowed }: { allowed: Action[] }) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    const isActive = (href: string) =>
        href === '/dashboard' ? pathname === href : pathname.startsWith(href);

    return (
        <>
            <div className="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                    <Sparkles aria-hidden className="h-4 w-4 text-primary" />
                    NEXA AI
                </Link>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-expanded={open}
                    aria-controls="dashboard-nav"
                    aria-label={open ? 'Close navigation' : 'Open navigation'}
                    onClick={() => setOpen(value => !value)}
                >
                    {open ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
                </Button>
            </div>

            <nav
                id="dashboard-nav"
                aria-label="Dashboard"
                className={cn(
                    'shrink-0 border-b border-border bg-surface/60 px-3 py-4 lg:block lg:w-64 lg:border-b-0 lg:border-r',
                    open ? 'block' : 'hidden',
                )}
            >
                <Link href="/dashboard" className="mb-6 hidden items-center gap-2 px-2 text-lg font-semibold lg:flex">
                    <Sparkles aria-hidden className="h-5 w-5 text-primary" />
                    NEXA AI
                </Link>

                <div className="space-y-6">
                    {NAV_SECTIONS.map(section => {
                        const items = section.items.filter(item => !item.requires || allowed.includes(item.requires));
                        if (items.length === 0) return null;

                        return (
                            <div key={section.title}>
                                <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                                    {section.title}
                                </p>
                                <ul className="space-y-1">
                                    {items.map(item => (
                                        <li key={item.href}>
                                            <Link
                                                href={item.href}
                                                onClick={() => setOpen(false)}
                                                aria-current={isActive(item.href) ? 'page' : undefined}
                                                className={cn(
                                                    'flex items-center gap-3 rounded-md px-2 py-2 text-sm transition',
                                                    isActive(item.href)
                                                        ? 'bg-primary/15 text-foreground'
                                                        : 'text-muted hover:bg-surface-raised hover:text-foreground',
                                                )}
                                            >
                                                <item.icon aria-hidden className="h-4 w-4" />
                                                {item.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
