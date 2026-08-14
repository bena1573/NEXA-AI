'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function WidgetSnippet({ widgetId, appUrl }: { widgetId: string; appUrl: string }) {
    const [copied, setCopied] = useState(false);
    const snippet = `<script src="${appUrl}/widget.js" data-widget-id="${widgetId}" defer></script>`;

    async function copy() {
        await navigator.clipboard.writeText(snippet);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <Card>
            <CardHeader>
                <div>
                    <CardTitle>Website chat widget</CardTitle>
                    <CardDescription>Paste this before the closing body tag on your site.</CardDescription>
                </div>
            </CardHeader>
            <CardBody className="space-y-3">
                <pre className="overflow-x-auto rounded-md border border-border bg-surface-raised/60 p-3 text-xs">
                    <code>{snippet}</code>
                </pre>
                <div className="flex items-center gap-3">
                    <Button type="button" variant="secondary" size="sm" onClick={() => void copy()}>
                        Copy snippet
                    </Button>
                    {copied && <span role="status" className="text-sm text-success">Copied.</span>}
                </div>
            </CardBody>
        </Card>
    );
}
