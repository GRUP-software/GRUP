// build-sitemap.js
import { SitemapStream, streamToPromise } from 'sitemap';
import { createWriteStream } from 'fs';
import { Readable } from 'stream';

async function build() {
    // 1. List every “public” route you want Google to crawl:
    const links = [
        { url: '/', changefreq: 'daily', priority: 1.0 },
        { url: '/login', changefreq: 'monthly', priority: 0.5 },
        { url: '/signup', changefreq: 'monthly', priority: 0.5 },
        // { url: '/listings', changefreq: 'daily', priority: 0.8 },
        { url: '/create-host', changefreq: 'weekly', priority: 0.7 },
        // …add any others (e.g. /about, /contact)
    ];

    // 2. Create a sitemap stream pointing to your production hostname
    const stream = new SitemapStream({ hostname: 'https://criibb.com' });

    // 3. Pipe your links into it and write to “dist” (or wherever you serve static files)
    const writeStream = createWriteStream('./dist/sitemap.xml');
    Readable.from(links).pipe(stream).pipe(writeStream);

    await streamToPromise(stream); // ensures the stream has finished
    // console.log('✅ sitemap.xml generated!');
}

build().catch(console.error);
