import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
    return (
        <span role="status" aria-live="polite" className={cn('inline-flex items-center gap-2 text-sm text-muted', className)}>
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            {label}
        </span>
    );
}

export function Skeleton({ className }: { className?: string }) {
    return <div aria-hidden className={cn('animate-pulse rounded-md bg-surface-raised', className)} />;
}

export function EmptyState({
    title,
    description,
    icon,
    action,
}: {
    title: string;
    description: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center">
            {icon && <div className="text-muted">{icon}</div>}
            <div>
                <p className="font-medium text-foreground">{title}</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted">{description}</p>
            </div>
            {action}
        </div>
    );
}

export function ErrorState({ message, action }: { message: string; action?: React.ReactNode }) {
    return (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-danger/40 bg-danger/10 p-4">
            <p className="flex items-center gap-2 text-sm text-danger">
                <AlertTriangle aria-hidden className="h-4 w-4" />
                {message}
            </p>
            {action}
        </div>
    );
}
