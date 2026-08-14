import type { Config } from 'tailwindcss';

export default {
    content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                background: 'hsl(var(--background))',
                surface: {
                    DEFAULT: 'hsl(var(--surface))',
                    raised: 'hsl(var(--surface-raised))',
                },
                border: 'hsl(var(--border))',
                foreground: 'hsl(var(--foreground))',
                muted: 'hsl(var(--muted))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                accent: 'hsl(var(--accent))',
                danger: 'hsl(var(--danger))',
                warning: 'hsl(var(--warning))',
                success: 'hsl(var(--success))',
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 0.25rem)',
                sm: 'calc(var(--radius) - 0.4rem)',
            },
            fontFamily: {
                sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
                mono: ['var(--font-mono)', 'monospace'],
            },
            keyframes: {
                'fade-up': {
                    from: { opacity: '0', transform: 'translateY(0.5rem)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                typing: {
                    '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
                    '30%': { transform: 'translateY(-0.2rem)', opacity: '1' },
                },
            },
            animation: {
                'fade-up': 'fade-up 0.4s ease-out both',
                typing: 'typing 1.2s infinite',
            },
        },
    },
    plugins: [require('tailwindcss-animate')],
} satisfies Config;
