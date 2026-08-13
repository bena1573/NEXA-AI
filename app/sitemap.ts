import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();
    return ['/', '/login', '/signup'].map(path => ({
        url: `${env.APP_URL}${path}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: path === '/' ? 1 : 0.5,
    }));
}
