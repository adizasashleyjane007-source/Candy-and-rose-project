import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/profile', '/history', '/reset-password', '/api/'],
    },
    sitemap: 'https://candyandrose.com/sitemap.xml',
  };
}
