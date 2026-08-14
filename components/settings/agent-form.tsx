'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AgentPersonality, ResponseStyle } from '@prisma/client';
import { apiRequest } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { ErrorState } from '@/components/ui/states';

type AgentSettings = {
    name: string;
    personality: AgentPersonality;
    responseStyle: ResponseStyle;
    greeting: string;
    instructions: string;
    escalationRules: string;
    handoffEmail: string;
};

const PERSONALITIES: AgentPersonality[] = ['PROFESSIONAL', 'FRIENDLY', 'CASUAL', 'FORMAL'];
const STYLES: ResponseStyle[] = ['SHORT', 'BALANCED', 'DETAILED'];

export function AgentSettingsForm({
    agent: initial,
    canWrite,
    demoMode,
}: {
    agent: AgentSettings;
    canWrite: boolean;
    demoMode: boolean;
}) {
    const router = useRouter();
    const [agent, setAgent] = useState(initial);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [pending, setPending] = useState(false);

    function update<K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) {
        setAgent(current => ({ ...current, [key]: value }));
        setSaved(false);
    }

    async function save(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setPending(true);
        setError(null);

        const { error: failure } = await apiRequest('/api/agent', { method: 'PATCH', body: agent });
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
                        <CardTitle>Agent persona</CardTitle>
                        <CardDescription>
                            How your agent introduces itself and speaks to customers.
                        </CardDescription>
                    </div>
                    {demoMode && <Badge tone="accent">Demo AI provider</Badge>}
                </CardHeader>
                <CardBody className="grid gap-4 sm:grid-cols-2">
                    {error && <div className="sm:col-span-2"><ErrorState message={error} /></div>}
                    <Field label="Agent name">
                        {props => (
                            <Input
                                {...props}
                                value={agent.name}
                                disabled={!canWrite}
                                onChange={event => update('name', event.target.value)}
                                required
                            />
                        )}
                    </Field>
                    <Field label="Handoff email" hint="Where escalations are sent once a mailer is connected.">
                        {props => (
                            <Input
                                {...props}
                                type="email"
                                value={agent.handoffEmail}
                                disabled={!canWrite}
                                onChange={event => update('handoffEmail', event.target.value)}
                            />
                        )}
                    </Field>
                    <Field label="Personality">
                        {props => (
                            <Select
                                {...props}
                                value={agent.personality}
                                disabled={!canWrite}
                                onChange={event => update('personality', event.target.value as AgentPersonality)}
                            >
                                {PERSONALITIES.map(option => (
                                    <option key={option} value={option}>{option.toLowerCase()}</option>
                                ))}
                            </Select>
                        )}
                    </Field>
                    <Field label="Response length">
                        {props => (
                            <Select
                                {...props}
                                value={agent.responseStyle}
                                disabled={!canWrite}
                                onChange={event => update('responseStyle', event.target.value as ResponseStyle)}
                            >
                                {STYLES.map(option => (
                                    <option key={option} value={option}>{option.toLowerCase()}</option>
                                ))}
                            </Select>
                        )}
                    </Field>
                    <Field label="Greeting" className="sm:col-span-2">
                        {props => (
                            <Textarea
                                {...props}
                                value={agent.greeting}
                                disabled={!canWrite}
                                onChange={event => update('greeting', event.target.value)}
                                required
                            />
                        )}
                    </Field>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Behaviour</CardTitle>
                        <CardDescription>
                            The agent still answers only from approved knowledge — these notes shape tone and routing,
                            not facts.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardBody className="space-y-4">
                    <Field label="Instructions" hint="For example: always confirm the appointment time back to the customer.">
                        {props => (
                            <Textarea
                                {...props}
                                className="min-h-32"
                                value={agent.instructions}
                                disabled={!canWrite}
                                onChange={event => update('instructions', event.target.value)}
                            />
                        )}
                    </Field>
                    <Field label="Escalation rules" hint="When should a human take over?">
                        {props => (
                            <Textarea
                                {...props}
                                value={agent.escalationRules}
                                disabled={!canWrite}
                                onChange={event => update('escalationRules', event.target.value)}
                            />
                        )}
                    </Field>
                </CardBody>
            </Card>

            {canWrite && (
                <div className="flex items-center gap-3">
                    <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save agent'}</Button>
                    {saved && <p role="status" className="text-sm text-success">Saved.</p>}
                </div>
            )}
        </form>
    );
}
