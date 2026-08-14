import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('surface rounded-lg', className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('flex items-start justify-between gap-4 p-5 pb-0', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return <h3 className={cn('text-sm font-semibold tracking-wide text-foreground', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return <p className={cn('text-sm text-muted', className)} {...props} />;
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('p-5', className)} {...props} />;
}
