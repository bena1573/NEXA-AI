'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { ErrorState } from '@/components/ui/states';
import { relativeTime } from '@/lib/utils';

type SessionRow = {
    id: string;
    userAgent: string | null;
    ip: string | null;
    createdAt: string;
    current: boolean;
};

export function SecurityPanel({ sessions }: { sessions: SessionRow[] }) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    async function changePassword(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);

        setPending(true);
        setError(null);
        setMessage(null);
        const { error: failure } = await apiRequest('/api/account/password', {
            body: {
                currentPassword: String(data.get('currentPassword') ?? ''),
                newPassword: String(data.get('newPassword') ?? ''),
            },
        });
        setPending(false);

        if (failure) {
            setError(failure.message);
            return;
        }
        form.reset();
        setMessage('Password changed. Other devices have been signed out.');
        router.refresh();
    }

    async function revokeOthers() {
        setPending(true);
        setError(null);
        setMessage(null);
        const { error: failure } = await apiRequest('/api/account/sessions', { method: 'DELETE' });
        setPending(false);

        if (failure) {
            setError(failure.message);
            return;
        }
        setMessage('Other sessions revoked.');
        router.refresh();
    }

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Change password</CardTitle>
                        <CardDescription>At least 10 characters, including a letter and a number.</CardDescription>
                    </div>
                </CardHeader>
                <CardBody>
                    <form onSubmit={changePassword} className="space-y-3">
                        {error && <ErrorState message={error} />}
                        {message && <p role="status" className="text-sm text-success">{message}</p>}
                        <Field label="Current password">
                            {props => <Input {...props} name="currentPassword" type="password" autoComplete="current-password" required />}
                        </Field>
                        <Field label="New password">
                            {props => <Input {...props} name="newPassword" type="password" autoComplete="new-password" required minLength={10} />}
                        </Field>
                        <Button type="submit" disabled={pending}>Update password</Button>
                    </form>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Active sessions</CardTitle>
                        <CardDescription>Signed-in devices for your account.</CardDescription>
                    </div>
                </CardHeader>
                <CardBody className="space-y-4">
                    <ul className="divide-y divide-border">
                        {sessions.map(session => (
                            <li key={session.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                                <div className="min-w-0">
                                    <p className="truncate">{session.userAgent ?? 'Unknown device'}</p>
                                    <p className="text-xs text-muted">
                                        {session.ip ?? 'unknown ip'} · started {relativeTime(session.createdAt)}
                                    </p>
                                </div>
                                {session.current && <Badge tone="primary">this device</Badge>}
                            </li>
                        ))}
                    </ul>
                    <Button variant="secondary" disabled={pending || sessions.length < 2} onClick={() => void revokeOthers()}>
                        Sign out other devices
                    </Button>
                </CardBody>
            </Card>
        </div>
    );
}
