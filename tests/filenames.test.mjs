import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const { outputFiles } = await build({
	stdin: { contents: `export { slugifyFilename } from './src/obsidianx/helpers/formatters.ts';`, resolveDir: fileURLToPath(new URL('../', import.meta.url)) },
	bundle: true, platform: 'node', format: 'cjs', write: false,
});
const module = { exports: {} };
new Function('module', 'exports', outputFiles[0].text)(module, module.exports);
const { slugifyFilename } = module.exports;

test('generated filenames remove heading, block, alias and wiki-link delimiters', () => {
	for(const character of ['#', '^', '[', ']', '|']) {
		assert.equal(slugifyFilename(`Before${character}After`), 'BeforeAfter');
	}
	assert.equal(slugifyFilename('Book #1 [Revised] ^edition'), 'Book 1 Revised edition');
	assert.equal(slugifyFilename('#[]^|'), 'Untitled');
});

test('filename sanitation retains readable Unicode and existing filename rules', () => {
	assert.equal(slugifyFilename('  Café 日本語 📚 (2020)  '), 'Café 日本語 📚 (2020)');
	assert.equal(slugifyFilename('...A: Book / Story? "Title".'), 'A Book Story Title');
	assert.equal(slugifyFilename('A'.repeat(200)).length, 180);
});
