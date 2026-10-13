import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const entry = fileURLToPath(new URL('../src/worker.ts', import.meta.url));
const output = fileURLToPath(new URL('../dist/_worker.js', import.meta.url));
await build({ entryPoints: [entry], outfile: output, bundle: true, format: 'esm', platform: 'browser', target: 'es2022' });
await writeFile(fileURLToPath(new URL('../dist/.assetsignore', import.meta.url)), '_worker.js\n_routes.json\n.assetsignore\n');
process.stdout.write('Bundled Cloudflare worker to dist/_worker.js.\n');
