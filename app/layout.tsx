import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { env } from '@/lib/env';
import './globals.css';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
    metadataBase: new URL(env.APP_URL),
    title: {
        default: 'NEXA AI — AI customer support and voice agents',
        template: '%s · NEXA AI',
    },
    description:
        'NEXA AI answers your customers on chat and phone using only your approved business information, '
        + 'books appointments, and escalates to your team when it should.',
    keywords: ['AI customer support', 'AI voice agent', 'AI receptionist', 'customer service automation'],
    openGraph: {
        type: 'website',
        siteName: 'NEXA AI',
        title: 'NEXA AI — AI customer support and voice agents',
        description: 'AI support that only answers from your approved business knowledge.',
        url: env.APP_URL,
    },
    twitter: { card: 'summary_large_image' },
    robots: { index: true, follow: true },
};

export const viewport: Viewport = {
    themeColor: '#070b14',
    width: 'device-width',
    initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={`${sans.variable} ${mono.variable}`}>
            <body className="font-sans antialiased">
                <a
                    href="#main"
                    className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
                >
                    Skip to content
                </a>
                {children}
            </body>
        </html>
    );
}
