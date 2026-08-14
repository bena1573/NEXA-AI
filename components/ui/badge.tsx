import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badge = cva('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', {
    variants: {
        tone: {
            neutral: 'border-border bg-surface-raised text-muted',
            primary: 'border-primary/40 bg-primary/10 text-primary',
            accent: 'border-accent/40 bg-accent/10 text-accent',
            success: 'border-success/40 bg-success/10 text-success',
            warning: 'border-warning/40 bg-warning/10 text-warning',
            danger: 'border-danger/40 bg-danger/10 text-danger',
        },
    },
    defaultVariants: { tone: 'neutral' },
});

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>;

export function Badge({ className, tone, ...props }: BadgeProps) {
    return <span className={cn(badge({ tone }), className)} {...props} />;
}
