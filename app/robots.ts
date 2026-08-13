import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [{ userAgent: '*', allow: '/', disallow: ['/dashboard', '/api', '/widget', '/onboarding'] }],
        sitemap: `${env.APP_URL}/sitemap.xml`,
    };
}
