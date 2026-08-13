'use client';

import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

const control = 'w-full rounded-md bg-surface-raised/60 border border-border px-3 py-2 text-sm '
    + 'text-foreground placeholder:text-muted/70 transition focus:border-primary/60 '
    + 'disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, ...props }, ref) => <input ref={ref} className={cn(control, 'h-10', className)} {...props} />,
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
    ({ className, ...props }, ref) => <textarea ref={ref} className={cn(control, 'min-h-24', className)} {...props} />,
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
    ({ className, ...props }, ref) => <select ref={ref} className={cn(control, 'h-10', className)} {...props} />,
);
Select.displayName = 'Select';

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
    return <label className={cn('text-sm font-medium text-foreground', className)} {...props} />;
}

export function Field({
    label,
    hint,
    error,
    children,
    className,
}: {
    label: string;
    hint?: string;
    error?: string;
    className?: string;
    children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => React.ReactNode;
}) {
    const id = useId();
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

    return (
        <div className={cn('space-y-1.5', className)}>
            <Label htmlFor={id}>{label}</Label>
            {children({ id, 'aria-describedby': describedBy, 'aria-invalid': Boolean(error) })}
            {hint && !error && <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p>}
            {error && <p id={`${id}-error`} className="text-xs text-danger">{error}</p>}
        </div>
    );
}
