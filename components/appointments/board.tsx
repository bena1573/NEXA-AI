'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AppointmentStatus } from '@prisma/client';
import { apiRequest } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { formatDateTime } from '@/lib/utils';

type Appointment = {
    id: string;
    startsAt: string;
    endsAt: string;
    status: AppointmentStatus;
    notes: string | null;
    bookedByAI: boolean;
    customer: { id: string; name: string | null; email: string | null; phone: string | null };
    service: { name: string; durationMin: number };
};

type Option = { id: string; name: string | null; email?: string | null; phone?: string | null };

const STATUS_TONE: Record<AppointmentStatus, 'success' | 'primary' | 'warning' | 'danger' | 'neutral'> = {
    CONFIRMED: 'success',
    REQUESTED: 'primary',
    COMPLETED: 'neutral',
    CANCELLED: 'danger',
    NO_SHOW: 'warning',
};

export function AppointmentsBoard({
    appointments,
    services,
    customers,
    canWrite,
}: {
    appointments: Appointment[];
    services: { id: string; name: string; durationMin: number }[];
    customers: Option[];
    canWrite: boolean;
}) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    async function book(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const local = String(data.get('startsAt') ?? '');
        if (!local) return;

        setPending(true);
        setError(null);
        const { error: failure } = await apiRequest('/api/appointments', {
            body: {
                customerId: String(data.get('customerId') ?? ''),
                serviceId: String(data.get('serviceId') ?? ''),
                startsAt: new Date(local).toISOString(),
                notes: String(data.get('notes') ?? '') || null,
            },
        });
        setPending(false);

        if (failure) {
            setError(failure.message);
            return;
        }
        form.reset();
        router.refresh();
    }

    async function setStatus(id: string, status: AppointmentStatus) {
        setPending(true);
        setError(null);
        const { error: failure } = await apiRequest(`/api/appointments/${id}`, {
            method: 'PATCH',
            body: { status },
        });
        setPending(false);

        if (failure) {
            setError(failure.message);
            return;
        }
        router.refresh();
    }

    return (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <Card>
                <CardHeader><CardTitle>Schedule</CardTitle></CardHeader>
                <CardBody className="space-y-4">
                    {error && <ErrorState message={error} />}
                    {appointments.length === 0
                        ? (
                            <EmptyState
                                title="No appointments yet"
                                description="Your agent books here automatically once you have bookable services and opening hours."
                            />
                        )
                        : (
                            <ul className="divide-y divide-border">
                                {appointments.map(appointment => (
                                    <li key={appointment.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                                        <div className="min-w-0">
                                            <p className="font-medium">
                                                {appointment.service.name} · {appointment.customer.name
                                                    ?? appointment.customer.email
                                                    ?? appointment.customer.phone
                                                    ?? 'Customer'}
                                            </p>
                                            <p className="text-xs text-muted">
                                                {formatDateTime(appointment.startsAt)} · {appointment.service.durationMin} min
                                                {appointment.bookedByAI ? ' · booked by AI' : ''}
                                            </p>
                                            {appointment.notes && <p className="text-xs text-muted">{appointment.notes}</p>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge tone={STATUS_TONE[appointment.status]}>
                                                {appointment.status.toLowerCase().replace(/_/g, ' ')}
                                            </Badge>
                                            {canWrite && appointment.status !== 'CANCELLED' && (
                                                <>
                                                    {appointment.status !== 'COMPLETED' && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            disabled={pending}
                                                            onClick={() => void setStatus(appointment.id, 'COMPLETED')}
                                                        >
                                                            Complete
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        disabled={pending}
                                                        onClick={() => void setStatus(appointment.id, 'CANCELLED')}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                </CardBody>
            </Card>

            {canWrite && (
                <Card>
                    <CardHeader><CardTitle>Add a booking</CardTitle></CardHeader>
                    <CardBody>
                        {services.length === 0 || customers.length === 0
                            ? (
                                <p className="text-sm text-muted">
                                    You need at least one bookable service and one customer before booking manually.
                                </p>
                            )
                            : (
                                <form onSubmit={book} className="space-y-3">
                                    <Field label="Customer">
                                        {props => (
                                            <Select {...props} name="customerId" required>
                                                {customers.map(customer => (
                                                    <option key={customer.id} value={customer.id}>
                                                        {customer.name ?? customer.email ?? customer.phone}
                                                    </option>
                                                ))}
                                            </Select>
                                        )}
                                    </Field>
                                    <Field label="Service">
                                        {props => (
                                            <Select {...props} name="serviceId" required>
                                                {services.map(service => (
                                                    <option key={service.id} value={service.id}>
                                                        {service.name} ({service.durationMin} min)
                                                    </option>
                                                ))}
                                            </Select>
                                        )}
                                    </Field>
                                    <Field label="Starts at" hint="Must fall inside opening hours.">
                                        {props => <Input {...props} type="datetime-local" name="startsAt" required />}
                                    </Field>
                                    <Field label="Notes">
                                        {props => <Textarea {...props} name="notes" />}
                                    </Field>
                                    <Button type="submit" className="w-full" disabled={pending}>Book</Button>
                                </form>
                            )}
                    </CardBody>
                </Card>
            )}
        </div>
    );
}
