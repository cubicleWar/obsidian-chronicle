import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const { outputFiles } = await build({
	stdin: { contents: `export { descriptionMarkdown } from './src/media/utilities/descriptionMarkdown.ts';`, resolveDir: fileURLToPath(new URL('../', import.meta.url)) },
	bundle: true, platform: 'node', format: 'cjs', write: false,
});
const module = { exports: {} };
new Function('require', 'module', 'exports', outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { descriptionMarkdown } = module.exports;

test('HTML paragraphs and repeated breaks become separated Markdown paragraphs', () => {
	for(const html of ['<p>First paragraph.</p><p>Second paragraph.</p>', 'First paragraph.<br><br>Second paragraph.', 'First paragraph.<BR /> \n <br />Second paragraph.', '<div>First paragraph.</div><div>Second paragraph.</div>']) {
		assert.equal(descriptionMarkdown(html), 'First paragraph.\n\nSecond paragraph.');
	}
});

test('single HTML breaks remain visible and inline tags never join adjacent words', () => {
	assert.equal(descriptionMarkdown('First line.<br>Second line.'), 'First line.  \nSecond line.');
	assert.equal(descriptionMarkdown('<b>First</b> <i>second</i> third.'), '**First** _second_ third.');
});

test('conversion preserves emphasis, links, entities, and list items', () => {
	const markdown = descriptionMarkdown('<p><b>A &amp; B</b> &lt; 3. <a href="https://example.org">Details</a></p><ul><li>First</li><li>Second</li></ul>');
	assert.match(markdown, /\*\*A & B\*\* < 3/);
	assert.match(markdown, /\[Details\]\(https:\/\/example.org\)/);
	assert.match(markdown, /-\s+First\n-\s+Second/);
});

test('existing Markdown and plain-text line breaks are preserved exactly', () => {
	for(const text of [null, '', 'One paragraph.\n\nAnother paragraph.', 'Wrapped text\ncontinues here.', '**Bold** and _emphasis_.\n\n- First\n- Second', '<https://example.org>\n\nNext paragraph.']) {
		assert.equal(descriptionMarkdown(text), text);
	}
	assert.equal(descriptionMarkdown(undefined), null);
});
