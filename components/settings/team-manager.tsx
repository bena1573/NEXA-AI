'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Role } from '@prisma/client';
import { apiRequest } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { ROLE_LABELS } from '@/lib/auth/permissions';
import { formatDate } from '@/lib/utils';

type Member = { id: string; role: Role; user: { id: string; name: string; email: string } };
type Invite = { id: string; email: string; role: Role; expiresAt: string };

const ASSIGNABLE: Role[] = ['OWNER', 'ADMIN', 'AGENT', 'VIEWER'];
const INVITABLE: Role[] = ['ADMIN', 'AGENT', 'VIEWER'];

export function TeamManager({
    members,
    invites,
    currentUserId,
    canInvite,
    canManage,
    demoMode,
}: {
    members: Member[];
    invites: Invite[];
    currentUserId: string;
    canInvite: boolean;
    canManage: boolean;
    demoMode: boolean;
}) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    async function send(path: string, options: { method?: string; body?: unknown }) {
        setPending(true);
        setError(null);
        const { error: failure } = await apiRequest(path, options);
        setPending(false);

        if (failure) {
            setError(failure.message);
            return false;
        }
        router.refresh();
        return true;
    }

    async function invite(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);

        const created = await send('/api/team', {
            body: { email: String(data.get('email') ?? ''), role: String(data.get('role') ?? 'AGENT') },
        });
        if (created) form.reset();
    }

    return (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div>
                            <CardTitle>Members</CardTitle>
                            <CardDescription>Roles decide what each person can see and change.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardBody className="space-y-4">
                        {error && <ErrorState message={error} />}
                        <ul className="divide-y divide-border">
                            {members.map(member => (
                                <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                                    <div className="min-w-0">
                                        <p className="font-medium">
                                            {member.user.name}
                                            {member.user.id === currentUserId && <span className="text-muted"> (you)</span>}
                                        </p>
                                        <p className="truncate text-xs text-muted">{member.user.email}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {canManage
                                            ? (
                                                <Select
                                                    aria-label={`Role for ${member.user.email}`}
                                                    className="h-9 w-auto"
                                                    value={member.role}
                                                    disabled={pending}
                                                    onChange={event => void send(`/api/team/members/${member.id}`, {
                                                        method: 'PATCH',
                                                        body: { role: event.target.value },
                                                    })}
                                                >
                                                    {ASSIGNABLE.map(role => (
                                                        <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                                                    ))}
                                                </Select>
                                            )
                                            : <Badge tone="neutral">{ROLE_LABELS[member.role]}</Badge>}
                                        {canManage && member.user.id !== currentUserId && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                disabled={pending}
                                                onClick={() => void send(`/api/team/members/${member.id}`, { method: 'DELETE' })}
                                            >
                                                Remove
                                            </Button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Pending invites</CardTitle></CardHeader>
                    <CardBody>
                        {invites.length === 0
                            ? <EmptyState title="No pending invites" description="Invite a teammate to help handle escalations." />
                            : (
                                <ul className="divide-y divide-border">
                                    {invites.map(pendingInvite => (
                                        <li key={pendingInvite.id} className="flex items-center justify-between gap-3 py-3">
                                            <div>
                                                <p className="text-sm">{pendingInvite.email}</p>
                                                <p className="text-xs text-muted">
                                                    {ROLE_LABELS[pendingInvite.role]} · expires {formatDate(pendingInvite.expiresAt)}
                                                </p>
                                            </div>
                                            {canInvite && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    disabled={pending}
                                                    onClick={() => void send(`/api/team/invites/${pendingInvite.id}`, { method: 'DELETE' })}
                                                >
                                                    Revoke
                                                </Button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                    </CardBody>
                </Card>
            </div>

            {canInvite && (
                <Card>
                    <CardHeader><CardTitle>Invite a teammate</CardTitle></CardHeader>
                    <CardBody>
                        <form onSubmit={invite} className="space-y-3">
                            <Field label="Email">
                                {props => <Input {...props} name="email" type="email" required />}
                            </Field>
                            <Field label="Role">
                                {props => (
                                    <Select {...props} name="role" defaultValue="AGENT">
                                        {INVITABLE.map(role => (
                                            <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                                        ))}
                                    </Select>
                                )}
                            </Field>
                            <Button type="submit" className="w-full" disabled={pending}>Send invite</Button>
                            {demoMode && (
                                <p className="text-xs text-muted">
                                    No mailer is connected in demo mode — the invite link is written to the server log.
                                </p>
                            )}
                        </form>
                    </CardBody>
                </Card>
            )}
        </div>
    );
}
