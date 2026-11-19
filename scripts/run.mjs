// Runs a script that imports app code (src/...) written for Vite (no file extensions,
// JSON imports, import.meta.env). It bundles the script with esbuild, then runs it.
// Usage: node scripts/run.mjs scripts/sync-sheet.js
import { build } from 'esbuild';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = process.argv[2];
if (!entry) {
  console.error('Usage: node scripts/run.mjs <script>');
  process.exit(1);
}

// Load .env.local / .env for local runs (Vercel provides real env vars at build time).
for (const f of ['.env.local', '.env']) {
  const p = join(root, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const outDir = join(root, 'node_modules', '.cache', 'kotoba-scripts');
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, entry.replace(/[\/]/g, '_') + '.mjs');
await build({
  entryPoints: [join(root, entry)],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  outfile,
  packages: 'external',
  define: { 'import.meta.env': '{}' },
  logLevel: 'error',
});
await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);
