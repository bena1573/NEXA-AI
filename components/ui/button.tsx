import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const button = cva(
    'inline-flex items-center justify-center gap-2 rounded-md font-medium transition '
    + 'disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap',
    {
        variants: {
            variant: {
                primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20',
                secondary: 'bg-surface-raised text-foreground border border-border hover:bg-surface-raised/70',
                ghost: 'text-muted hover:bg-surface-raised hover:text-foreground',
                danger: 'bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25',
                link: 'text-primary underline-offset-4 hover:underline',
            },
            size: {
                sm: 'h-8 px-3 text-sm',
                md: 'h-10 px-4 text-sm',
                lg: 'h-12 px-6 text-base',
                icon: 'h-9 w-9',
            },
        },
        defaultVariants: { variant: 'primary', size: 'md' },
    },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>
    & VariantProps<typeof button>
    & { asChild?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild, ...props }, ref) => {
        const Component = asChild ? Slot : 'button';
        return <Component ref={ref} className={cn(button({ variant, size }), className)} {...props} />;
    },
);
Button.displayName = 'Button';

export { button as buttonStyles };
