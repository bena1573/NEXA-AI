import type { Metadata } from 'next';
import { AppointmentsBoard } from '@/components/appointments/board';
import { requirePermission } from '@/lib/auth/context';
import { can } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/client';

export const metadata: Metadata = { title: 'Appointments' };

export default async function AppointmentsPage() {
    const ctx = await requirePermission('appointment:read');

    const [appointments, services, customers] = await Promise.all([
        prisma.appointment.findMany({
            where: { businessId: ctx.businessId },
            orderBy: { startsAt: 'asc' },
            take: 100,
            select: {
                id: true, startsAt: true, endsAt: true, status: true, notes: true, bookedByAI: true,
                customer: { select: { id: true, name: true, email: true, phone: true } },
                service: { select: { name: true, durationMin: true } },
            },
        }),
        prisma.service.findMany({
            where: { businessId: ctx.businessId, bookable: true },
            orderBy: { name: 'asc' },
            select: { id: true, name: true, durationMin: true },
        }),
        prisma.customer.findMany({
            where: { businessId: ctx.businessId },
            orderBy: { createdAt: 'desc' },
            take: 200,
            select: { id: true, name: true, email: true, phone: true },
        }),
    ]);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-xl font-semibold">Appointments</h1>
                <p className="text-sm text-muted">Bookings your agent made and the ones your team added.</p>
            </header>
            <AppointmentsBoard
                appointments={appointments.map(appointment => ({
                    ...appointment,
                    startsAt: appointment.startsAt.toISOString(),
                    endsAt: appointment.endsAt.toISOString(),
                }))}
                services={services}
                customers={customers}
                canWrite={can(ctx.role, 'appointment:write')}
            />
        </div>
    );
}
