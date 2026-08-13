'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input, Label, Textarea } from '@/components/ui/field';
import { ErrorState } from '@/components/ui/states';

type Profile = {
    name: string;
    industry: string | null;
    description: string | null;
    website: string | null;
    phone: string | null;
    email: string | null;
    addressLine: string | null;
    city: string | null;
    country: string | null;
    timezone: string;
};

type Hour = { weekday: number; closed: boolean; opensAt: string | null; closesAt: string | null };

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function BusinessSettingsForm({
    business,
    hours: initialHours,
    canWrite,
}: {
    business: Profile;
    hours: Hour[];
    canWrite: boolean;
}) {
    const router = useRouter();
    const [profile, setProfile] = useState(business);
    const [hours, setHours] = useState(initialHours);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [pending, setPending] = useState(false);

    function update<K extends keyof Profile>(key: K, value: Profile[K]) {
        setProfile(current => ({ ...current, [key]: value }));
        setSaved(false);
    }

    function updateHour(weekday: number, patch: Partial<Hour>) {
        setHours(current => current.map(hour => (hour.weekday === weekday ? { ...hour, ...patch } : hour)));
        setSaved(false);
    }

    async function save(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setPending(true);
        setError(null);

        const { error: failure } = await apiRequest('/api/business', {
            method: 'PATCH',
            body: {
                profile,
                hours: hours.map(hour => ({
                    weekday: hour.weekday,
                    closed: hour.closed,
                    opensAt: hour.closed ? null : hour.opensAt,
                    closesAt: hour.closed ? null : hour.closesAt,
                })),
            },
        });
        setPending(false);

        if (failure) {
            setError(failure.message);
            return;
        }
        setSaved(true);
        router.refresh();
    }

    return (
        <form onSubmit={save} className="space-y-6">
            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Business profile</CardTitle>
                        <CardDescription>Your agent uses these details when answering customers.</CardDescription>
                    </div>
                </CardHeader>
                <CardBody className="grid gap-4 sm:grid-cols-2">
                    {error && <div className="sm:col-span-2"><ErrorState message={error} /></div>}
                    <Field label="Business name">
                        {props => (
                            <Input
                                {...props}
                                value={profile.name}
                                disabled={!canWrite}
                                onChange={event => update('name', event.target.value)}
                                required
                            />
                        )}
                    </Field>
                    <Field label="Industry">
                        {props => (
                            <Input
                                {...props}
                                value={profile.industry ?? ''}
                                disabled={!canWrite}
                                onChange={event => update('industry', event.target.value)}
                            />
                        )}
                    </Field>
                    <Field label="Description" className="sm:col-span-2">
                        {props => (
                            <Textarea
                                {...props}
                                value={profile.description ?? ''}
                                disabled={!canWrite}
                                onChange={event => update('description', event.target.value)}
                            />
                        )}
                    </Field>
                    <Field label="Website">
                        {props => (
                            <Input
                                {...props}
                                value={profile.website ?? ''}
                                disabled={!canWrite}
                                onChange={event => update('website', event.target.value)}
                            />
                        )}
                    </Field>
                    <Field label="Public email">
                        {props => (
                            <Input
                                {...props}
                                type="email"
                                value={profile.email ?? ''}
                                disabled={!canWrite}
                                onChange={event => update('email', event.target.value)}
                            />
                        )}
                    </Field>
                    <Field label="Phone">
                        {props => (
                            <Input
                                {...props}
                                value={profile.phone ?? ''}
                                disabled={!canWrite}
                                onChange={event => update('phone', event.target.value)}
                            />
                        )}
                    </Field>
                    <Field label="Timezone" hint="IANA name, for example Europe/London.">
                        {props => (
                            <Input
                                {...props}
                                value={profile.timezone}
                                disabled={!canWrite}
                                onChange={event => update('timezone', event.target.value)}
                                required
                            />
                        )}
                    </Field>
                    <Field label="Address">
                        {props => (
                            <Input
                                {...props}
                                value={profile.addressLine ?? ''}
                                disabled={!canWrite}
                                onChange={event => update('addressLine', event.target.value)}
                            />
                        )}
                    </Field>
                    <Field label="City">
                        {props => (
                            <Input
                                {...props}
                                value={profile.city ?? ''}
                                disabled={!canWrite}
                                onChange={event => update('city', event.target.value)}
                            />
                        )}
                    </Field>
                    <Field label="Country">
                        {props => (
                            <Input
                                {...props}
                                value={profile.country ?? ''}
                                disabled={!canWrite}
                                onChange={event => update('country', event.target.value)}
                            />
                        )}
                    </Field>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Opening hours</CardTitle>
                        <CardDescription>Bookings are only offered inside these hours.</CardDescription>
                    </div>
                </CardHeader>
                <CardBody className="space-y-3">
                    {hours.map(hour => (
                        <div key={hour.weekday} className="flex flex-wrap items-center gap-3">
                            <span className="w-24 text-sm">{DAYS[hour.weekday]}</span>
                            <label className="flex items-center gap-2 text-sm text-muted">
                                <input
                                    type="checkbox"
                                    checked={!hour.closed}
                                    disabled={!canWrite}
                                    onChange={event => updateHour(hour.weekday, { closed: !event.target.checked })}
                                />
                                Open
                            </label>
                            {!hour.closed && (
                                <>
                                    <Label className="sr-only" htmlFor={`opens-${hour.weekday}`}>
                                        {DAYS[hour.weekday]} opening time
                                    </Label>
                                    <Input
                                        id={`opens-${hour.weekday}`}
                                        type="time"
                                        className="h-9 w-32"
                                        value={hour.opensAt ?? '09:00'}
                                        disabled={!canWrite}
                                        onChange={event => updateHour(hour.weekday, { opensAt: event.target.value })}
                                    />
                                    <Label className="sr-only" htmlFor={`closes-${hour.weekday}`}>
                                        {DAYS[hour.weekday]} closing time
                                    </Label>
                                    <Input
                                        id={`closes-${hour.weekday}`}
                                        type="time"
                                        className="h-9 w-32"
                                        value={hour.closesAt ?? '17:00'}
                                        disabled={!canWrite}
                                        onChange={event => updateHour(hour.weekday, { closesAt: event.target.value })}
                                    />
                                </>
                            )}
                        </div>
                    ))}
                </CardBody>
            </Card>

            {canWrite && (
                <div className="flex items-center gap-3">
                    <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save changes'}</Button>
                    {saved && <p role="status" className="text-sm text-success">Saved.</p>}
                </div>
            )}
        </form>
    );
}
