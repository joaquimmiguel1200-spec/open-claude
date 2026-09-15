import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots { const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://open-claude.vercel.app'; return { rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/chat', '/projects', '/files', '/settings'] }], sitemap: `${base}/sitemap.xml` } }
