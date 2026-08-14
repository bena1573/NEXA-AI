import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import { CustomerForm } from '@/components/customers/customer-form';
import { requirePermission } from '@/lib/auth/context';
import { can } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/client';
import { relativeTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Customers' };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const ctx = await requirePermission('customer:read');
    const { q } = await searchParams;
    const query = q?.trim();

    const customers = await prisma.customer.findMany({
        where: {
            businessId: ctx.businessId,
            ...(query
                ? {
                    OR: [
                        { name: { contains: query, mode: 'insensitive' as const } },
                        { email: { contains: query, mode: 'insensitive' as const } },
                        { phone: { contains: query } },
                    ],
                }
                : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
            id: true, name: true, email: true, phone: true, status: true, createdAt: true,
            _count: { select: { conversations: true, appointments: true } },
        },
    });

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-xl font-semibold">Customers</h1>
                <p className="text-sm text-muted">Everyone your agent has spoken to, plus records your team added.</p>
            </header>

            <form className="flex gap-2" role="search">
                <input
                    type="search"
                    name="q"
                    defaultValue={query ?? ''}
                    aria-label="Search customers"
                    placeholder="Search by name, email or phone"
                    className="h-10 w-full max-w-sm rounded-md border border-border bg-surface-raised/60 px-3 text-sm"
                />
                <button type="submit" className="rounded-md border border-border px-3 text-sm">Search</button>
            </form>

            <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
                <Card>
                    <CardHeader><CardTitle>{customers.length} records</CardTitle></CardHeader>
                    <CardBody>
                        {customers.length === 0
                            ? <EmptyState title="No customers found" description="Customer records are created automatically when contact details are shared in a conversation." />
                            : (
                                <ul className="divide-y divide-border">
                                    {customers.map(customer => (
                                        <li key={customer.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                                            <div className="min-w-0">
                                                <Link href={`/dashboard/customers/${customer.id}`} className="font-medium hover:text-primary">
                                                    {customer.name ?? customer.email ?? customer.phone ?? 'Unnamed customer'}
                                                </Link>
                                                <p className="truncate text-xs text-muted">
                                                    {[customer.email, customer.phone].filter(Boolean).join(' · ') || 'No contact details'}
                                                    {' · '}
                                                    {customer._count.conversations} conversations · {customer._count.appointments} appointments
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted">
                                                <Badge tone="neutral">{customer.status.toLowerCase().replace(/_/g, ' ')}</Badge>
                                                {relativeTime(customer.createdAt)}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                    </CardBody>
                </Card>

                {can(ctx.role, 'customer:write') && <CustomerForm />}
            </div>
        </div>
    );
}
