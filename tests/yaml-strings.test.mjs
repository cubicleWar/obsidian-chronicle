import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { load, JSON_SCHEMA } from 'js-yaml';

const { outputFiles } = await build({
	stdin: { contents: `export { toYamlSafeString, toBacklink } from './src/obsidianx/helpers/formatters.ts';`, resolveDir: fileURLToPath(new URL('../', import.meta.url)) },
	bundle: true, platform: 'node', format: 'cjs', write: false,
});
const module = { exports: {} };
new Function('module', 'exports', outputFiles[0].text)(module, module.exports);
const { toYamlSafeString, toBacklink } = module.exports;

test('YAML string properties round-trip punctuation, whitespace and scalar-like text', () => {
	const values = ['Book #1', 'Title:', 'A: B', '#tag', '00123', '1e3', '.nan', 'true', 'false', 'null', 'yes', '2020-01-01', '', '   ', ' padded ', 'A "quote" \\ slash', 'Line one\n\nLine two\r\nEnd\t.', '日本語 📚', '[brackets]', '{mapping}', 'https://example.org/image?q=a#b'];
	values.push(...Array.from({ length: 32 }, (_, i) => `a${String.fromCharCode(i)}b`));
	values.push(...Array.from({ length: 33 }, (_, i) => `a${String.fromCharCode(127 + i)}b`));
	values.push('a\u2028b\u2029c');
	for(const schema of [JSON_SCHEMA, undefined]) {
		for(const value of values) {
			assert.equal(load(`title: ${toYamlSafeString(value)}\nnext: kept`, { schema }).title, value, JSON.stringify(value));
		}
	}
});

test('frontmatter backlinks escape renamed paths without changing body embeds', () => {
	const path = 'Notes/A "quoted" \\ path.md';
	assert.equal(load(`link: ${toBacklink(path)}`).link, `[[${path}]]`);
	assert.equal(toBacklink(path, 'embed'), `![[${path}]]`);
	assert.equal(toBacklink(path, 'body'), `[[${path}]]`);
});
