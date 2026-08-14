'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { FileText, Globe, RefreshCw, Trash2, Upload } from 'lucide-react';
import { apiRequest, type ApiFailure } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/field';
import { EmptyState, ErrorState, Spinner } from '@/components/ui/states';
import { cn, formatDate } from '@/lib/utils';

export type DocumentRow = {
    id: string;
    title: string;
    type: string;
    status: string;
    chunkCount: number;
    sourceUrl: string | null;
    error: string | null;
    createdAt: string;
};

export type FaqRow = {
    id: string;
    question: string;
    answer: string;
    approved: boolean;
    askedCount: number;
};

const STATUS_TONE = {
    READY: 'success',
    PROCESSING: 'primary',
    PENDING: 'neutral',
    FAILED: 'danger',
} as const;

type Tab = 'documents' | 'faqs';

export function KnowledgeManager({
    documents,
    faqs,
    canWrite,
}: {
    documents: DocumentRow[];
    faqs: FaqRow[];
    canWrite: boolean;
}) {
    const router = useRouter();
    const [tab, setTab] = useState<Tab>('documents');
    const [failure, setFailure] = useState<ApiFailure | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);

    async function run(label: string, action: () => Promise<{ error: ApiFailure | null }>) {
        setBusy(label);
        setFailure(null);
        const { error } = await action();
        setBusy(null);
        if (error) {
            setFailure(error);
            return false;
        }
        router.refresh();
        return true;
    }

    async function addText(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const done = await run('text', () => apiRequest('/api/knowledge/documents?kind=text', {
            body: {
                title: String(data.get('title') ?? ''),
                content: String(data.get('content') ?? ''),
            },
        }));
        if (done) form.reset();
    }

    async function addUrl(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const done = await run('url', () => apiRequest('/api/knowledge/documents?kind=url', {
            body: { url: String(data.get('url') ?? '') },
        }));
        if (done) form.reset();
    }

    async function upload(file: File) {
        setBusy('upload');
        setFailure(null);

        const body = new FormData();
        body.append('file', file);
        const response = await fetch('/api/knowledge/documents/upload', { method: 'POST', body });
        setBusy(null);

        if (!response.ok) {
            const payload: unknown = await response.json().catch(() => null);
            const message = payload && typeof payload === 'object' && 'error' in payload
                && typeof (payload as { error: { message?: unknown } }).error?.message === 'string'
                ? (payload as { error: { message: string } }).error.message
                : 'That file could not be processed.';
            setFailure({ code: 'BAD_REQUEST', message });
            return;
        }

        if (fileInput.current) fileInput.current.value = '';
        router.refresh();
    }

    async function addFaq(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const done = await run('faq', () => apiRequest('/api/knowledge/faqs', {
            body: {
                question: String(data.get('question') ?? ''),
                answer: String(data.get('answer') ?? ''),
                approved: true,
            },
        }));
        if (done) form.reset();
    }

    return (
        <div className="space-y-6">
            <div role="tablist" aria-label="Knowledge sources" className="flex gap-2">
                {(['documents', 'faqs'] as Tab[]).map(value => (
                    <button
                        key={value}
                        role="tab"
                        type="button"
                        aria-selected={tab === value}
                        onClick={() => setTab(value)}
                        className={cn(
                            'rounded-md px-3 py-1.5 text-sm capitalize transition',
                            tab === value ? 'bg-primary/15 text-foreground' : 'text-muted hover:text-foreground',
                        )}
                    >
                        {value === 'faqs' ? `FAQs (${faqs.length})` : `Documents (${documents.length})`}
                    </button>
                ))}
            </div>

            {failure && <ErrorState message={failure.message} />}

            {tab === 'documents' && (
                <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Documents</CardTitle>
                            {busy && <Spinner label="Processing" />}
                        </CardHeader>
                        <CardBody>
                            {documents.length === 0
                                ? (
                                    <EmptyState
                                        icon={<FileText aria-hidden className="h-6 w-6" />}
                                        title="No documents yet"
                                        description="Paste your policies, import a page from your website, or upload a PDF."
                                    />
                                )
                                : (
                                    <ul className="divide-y divide-border">
                                        {documents.map(document => (
                                            <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium">{document.title}</p>
                                                    <p className="truncate text-xs text-muted">
                                                        {document.type} · {document.chunkCount} chunks · {formatDate(document.createdAt)}
                                                        {document.sourceUrl ? ` · ${document.sourceUrl}` : ''}
                                                    </p>
                                                    {document.error && <p className="text-xs text-danger">{document.error}</p>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge tone={STATUS_TONE[document.status as keyof typeof STATUS_TONE] ?? 'neutral'}>
                                                        {document.status.toLowerCase()}
                                                    </Badge>
                                                    {canWrite && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                aria-label={`Re-index ${document.title}`}
                                                                onClick={() => run(document.id, () =>
                                                                    apiRequest(`/api/knowledge/documents/${document.id}`, { body: {} }))}
                                                            >
                                                                <RefreshCw aria-hidden className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                aria-label={`Delete ${document.title}`}
                                                                onClick={() => run(document.id, () =>
                                                                    apiRequest(`/api/knowledge/documents/${document.id}`, { method: 'DELETE' }))}
                                                            >
                                                                <Trash2 aria-hidden className="h-4 w-4" />
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
                        <div className="space-y-4">
                            <Card>
                                <CardBody>
                                    <form onSubmit={addText} className="space-y-3">
                                        <Field label="Paste text">
                                            {props => <Input {...props} name="title" placeholder="Refund policy" required />}
                                        </Field>
                                        <Textarea
                                            name="content"
                                            aria-label="Text content"
                                            placeholder="Paste the content your agent may quote…"
                                            required
                                        />
                                        <Button type="submit" className="w-full" disabled={busy === 'text'}>
                                            Add text
                                        </Button>
                                    </form>
                                </CardBody>
                            </Card>

                            <Card>
                                <CardBody>
                                    <form onSubmit={addUrl} className="space-y-3">
                                        <Field label="Import a page" hint="We read the visible text only.">
                                            {props => <Input {...props} name="url" placeholder="https://your-site.com/faq" required />}
                                        </Field>
                                        <Button type="submit" variant="secondary" className="w-full" disabled={busy === 'url'}>
                                            <Globe aria-hidden className="h-4 w-4" />
                                            Import URL
                                        </Button>
                                    </form>
                                </CardBody>
                            </Card>

                            <Card>
                                <CardBody className="space-y-3">
                                    <p className="text-sm font-medium">Upload a file</p>
                                    <p className="text-xs text-muted">PDF, DOCX, TXT or MD, up to 10 MB.</p>
                                    <input
                                        ref={fileInput}
                                        type="file"
                                        accept=".pdf,.docx,.txt,.md"
                                        aria-label="Knowledge file"
                                        className="w-full text-sm text-muted"
                                        onChange={event => {
                                            const file = event.target.files?.[0];
                                            if (file) void upload(file);
                                        }}
                                    />
                                    {busy === 'upload' && <Spinner label="Extracting and embedding" />}
                                    <p className="flex items-center gap-2 text-xs text-muted">
                                        <Upload aria-hidden className="h-3 w-3" />
                                        Text is extracted, chunked and embedded on upload.
                                    </p>
                                </CardBody>
                            </Card>
                        </div>
                    )}
                </div>
            )}

            {tab === 'faqs' && (
                <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
                    <Card>
                        <CardHeader>
                            <CardTitle>FAQs</CardTitle>
                        </CardHeader>
                        <CardBody>
                            {faqs.length === 0
                                ? (
                                    <EmptyState
                                        title="No FAQs yet"
                                        description="FAQs are quoted almost word for word, so they are the fastest way to control answers."
                                    />
                                )
                                : (
                                    <ul className="divide-y divide-border">
                                        {faqs.map(faq => (
                                            <li key={faq.id} className="space-y-1 py-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <p className="font-medium">{faq.question}</p>
                                                    <div className="flex shrink-0 items-center gap-2">
                                                        <Badge tone={faq.approved ? 'success' : 'warning'}>
                                                            {faq.approved ? 'approved' : 'draft'}
                                                        </Badge>
                                                        {canWrite && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => run(faq.id, () => apiRequest(
                                                                        `/api/knowledge/faqs/${faq.id}`,
                                                                        { method: 'PATCH', body: { approved: !faq.approved } },
                                                                    ))}
                                                                >
                                                                    {faq.approved ? 'Unapprove' : 'Approve'}
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    aria-label={`Delete FAQ: ${faq.question}`}
                                                                    onClick={() => run(faq.id, () => apiRequest(
                                                                        `/api/knowledge/faqs/${faq.id}`,
                                                                        { method: 'DELETE' },
                                                                    ))}
                                                                >
                                                                    <Trash2 aria-hidden className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-muted">{faq.answer}</p>
                                                <p className="text-xs text-muted">Asked {faq.askedCount} times</p>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                        </CardBody>
                    </Card>

                    {canWrite && (
                        <Card>
                            <CardBody>
                                <form onSubmit={addFaq} className="space-y-3">
                                    <Field label="Question">
                                        {props => <Input {...props} name="question" placeholder="Do you accept walk-ins?" required />}
                                    </Field>
                                    <Field label="Approved answer">
                                        {props => <Textarea {...props} name="answer" required />}
                                    </Field>
                                    <Button type="submit" className="w-full" disabled={busy === 'faq'}>Add FAQ</Button>
                                </form>
                            </CardBody>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
