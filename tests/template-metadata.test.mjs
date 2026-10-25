import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const { outputFiles } = await build({
	stdin: { contents: `
		export { NoteRenderer } from './src/obsidianx/services/NoteRenderer.ts';
		export { matchesMediaNote } from './src/media/utilities/mediaNoteMatching.ts';
		export { templateMetadata } from './src/chronicle/templates/TemplateMetadata.ts';
		export { BOOK_TEMPLATE } from './src/chronicle/templates/BookTemplate.ts';
		export { MOVIE_TEMPLATE } from './src/chronicle/templates/MovieTemplate.ts';
		export { SERIES_TEMPLATE } from './src/chronicle/templates/SeriesTemplate.ts';
		export { SERIES_SEASON_TEMPLATE } from './src/chronicle/templates/SeriesSeasonTemplate.ts';
		export { MINISERIES_TEMPLATE } from './src/chronicle/templates/MiniSeriesTemplate.ts';
	`, resolveDir: fileURLToPath(new URL('../', import.meta.url)) },
	bundle: true, platform: 'node', format: 'cjs', external: ['obsidian'], write: false,
});
const module = { exports: {} };
new Function('require', 'module', 'exports', outputFiles[0].text)(require, module, module.exports);
const { NoteRenderer, templateMetadata, matchesMediaNote, ...templates } = module.exports;
const metadata = rendered => JSON.parse(rendered.match(/^chronicle_template_id: (.+)$/m)[1]);
const makeSource = (id = 'book-2026-10-25a') => `---\n${templateMetadata(id)}\n---\n# {{ title }}\n`;

for (const [name, type] of Object.entries({ BOOK_TEMPLATE: 'book', MOVIE_TEMPLATE: 'movie', SERIES_TEMPLATE: 'series', SERIES_SEASON_TEMPLATE: 'series_season', MINISERIES_TEMPLATE: 'miniseries' }))
{
	test(`${name} puts title first and a dated template ID last`, () => {
		const content = templates[name].content;
		assert.equal(metadata(content), `${type}-2026-10-25a`);
		assert.match(content, /^---\ntitle: /);
		assert.doesNotMatch(content, /^chronicle_template(?:_version|_hash)?:/m);
		const properties = content.split('\n---')[0].split('\n').slice(1).map(line => line.split(':')[0]);
		assert.deepEqual(properties.slice(-1), ['chronicle_template_id']);
	});
}

test('rendering preserves the declared revision regardless of note data', async () => {
	const renderer = new NoteRenderer({ readNote: async () => makeSource() }, 'Template.md');
	const first = await renderer.render({ title: 'First book' });
	const second = await renderer.render({ title: 'Second book' });
	assert.equal(metadata(first), 'book-2026-10-25a');
	assert.equal(metadata(second), metadata(first));
	assert.match(second, /# Second book/);
});

test('template edits and explicit revision changes are picked up without a reload', async () => {
	let source = makeSource();
	const renderer = new NoteRenderer({ readNote: async () => source }, 'Template.md');
	await renderer.render({ title: 'Book' });
	source += '\nMy review — 読書 📚\n';
	const rendered = await renderer.render({ title: 'Book' });
	assert.ok(rendered.includes('My review — 読書 📚'));
	assert.equal(metadata(rendered), 'book-2026-10-25a');
	source = makeSource('book-2026-10-25b');
	assert.equal(metadata(await renderer.render({ title: 'Book' })), 'book-2026-10-25b');
	source = '';
	assert.equal(await renderer.render({ title: 'Book' }), '');
	source = null;
	assert.deepEqual(JSON.parse(await renderer.render({ title: 'Book' })), { title: 'Book' });
});

test('moving a template preserves its ID', async () => {
	const files = { readNote: async () => makeSource() };
	const first = metadata(await new NoteRenderer(files, 'Old.md').render({ title: 'Book' }));
	const moved = metadata(await new NoteRenderer(files, 'Templates/Renamed.md').render({ title: 'Book' }));
	assert.equal(moved, first);
});

test('templates without metadata keep their existing output', async () => {
	const renderer = new NoteRenderer({ readNote: async () => '# {{ title }}' }, 'Legacy.md');
	assert.equal(await renderer.render({ title: 'Book' }), '# Book');
});

test('concurrent renders use their own template source', async () => {
	const sources = [makeSource('book-2026-10-25a'), makeSource('book-2026-10-25b')];
	let index = 0;
	const renderer = new NoteRenderer({ readNote: async () => sources[index++] }, 'Template.md');
	const results = await Promise.all([renderer.render({ title: 'One' }), renderer.render({ title: 'Two' })]);
	assert.equal(metadata(results[0]), 'book-2026-10-25a');
	assert.equal(metadata(results[1]), 'book-2026-10-25b');
});

for (const revision of ['', '-2026-10-25a', '-2026-10-25b', '-2027-01-01aa'])
{
	test(`media matching recognizes template types with revision ${revision || '(legacy)'}`, () => {
		const media = { tmdb_id: 42, series_tmdb_id: 42, season_number: 1 };
		for (const type of ['movie', 'series', 'series_season', 'miniseries'])
		{
			const fm = { chronicle_template_id: type + revision, tmdb_id: 42, series_tmdb_id: 42, season: 1 };
			for (const requested of ['movie', 'series', 'series_season', 'miniseries'])
			{
				assert.equal(matchesMediaNote(requested, media, fm), requested === type, `${requested} vs ${type}`);
			}
		}
		assert.equal(matchesMediaNote('movie', media, { chronicle_template_id: 'book' + revision, tmdb_id: 42 }), false);
	});
}

test('unknown template IDs still use structural fields without assuming a type from an arbitrary prefix', () => {
	const media = { tmdb_id: 42 };
	assert.equal(matchesMediaNote('movie', media, { chronicle_template_id: 'custom', tmdb_id: 42, director: 'Director' }), true);
	assert.equal(matchesMediaNote('movie', media, { chronicle_template_id: 'movie-custom', tmdb_id: 42 }), false);
});
