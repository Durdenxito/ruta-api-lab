import { readFile, mkdir, writeFile, cp } from 'node:fs/promises';
await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });
const html = await readFile('public/index.html', 'utf8');
await writeFile('dist/server/index.js', `const HTML = ${JSON.stringify(html)};\n${await readFile('worker/index.js','utf8')}`);
await writeFile('dist/index.html', html);
await writeFile('dist/.nojekyll', '');
await cp('.openai/hosting.json', 'dist/.openai/hosting.json');
console.log('Worker ESM e interfaz construidos.');
