import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
// Deliberate allowlist: source SQL, exports, .env and API helpers are never public assets.
for (const name of ['index.html', 'app.js', 'cms-client.js', 'styles.css']) await copyFile(name, `dist/${name}`);
console.log('Static website built in dist/. Vercel deploys api/ separately.');
