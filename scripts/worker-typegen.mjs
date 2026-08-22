import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const outputPath = resolve('src/worker/worker-configuration.d.ts');
const outputArgument = './src/worker/worker-configuration.d.ts';
const wranglerPath = resolve('node_modules/wrangler/bin/wrangler.js');
const checkOnly = process.argv.includes('--check');

function normalizeGeneratedTypes(source) {
  return source.replace(/[\t ]+(?=\r?$)/gm, '');
}

function generateTypes() {
  execFileSync(process.execPath, [wranglerPath, 'types', outputArgument], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
}

if (!checkOnly) {
  generateTypes();
  const generated = readFileSync(outputPath, 'utf8');
  const normalized = normalizeGeneratedTypes(generated);
  if (normalized !== generated) {
    writeFileSync(outputPath, normalized);
  }
  process.exit(0);
}

const current = readFileSync(outputPath, 'utf8');
let generated;

try {
  generateTypes();
  generated = normalizeGeneratedTypes(readFileSync(outputPath, 'utf8'));
} finally {
  writeFileSync(outputPath, current);
}

if (current !== generated) {
  console.error('Worker types are out of date. Run `npm run cf-typegen` to regenerate them.');
  process.exit(1);
}

console.log('Worker types are up to date.');
