import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { outputFiles } = await build({
	stdin: { contents: `export { MediaDataOrchestrator } from './src/chronicle/services/MediaDataOrchestrator.ts';`, resolveDir: fileURLToPath(new URL('../', import.meta.url)) },
	bundle: true, platform: 'node', format: 'cjs', external: ['obsidian'], write: false,
});
const module = { exports: {} };
new Function('require', 'module', 'exports', outputFiles[0].text)(name => name === 'obsidian' ? {} : require(name), module, module.exports);

for(const type of ['movie', 'series'])
{
	function setup(secondary, primary = { title: 'Selected', imdb_id: 'tt100', tmdb_id: 10, cast: ['Primary actor'] }) {
		const service = Object.create(module.exports.MediaDataOrchestrator.prototype);
		const calls = [];
		service.getClients = () => [
			{ id_name: 'tmdb_id', [type]: { get: async () => primary, normalize: data => data } },
			{ id_name: 'imdb_id', [type]: { get: async id => { calls.push(['get', id]); return secondary; }, normalize: data => data }, find: async (_, item) => { calls.push(['find', item]); return secondary; } },
		];
		return { service, calls };
	}
	test(`${type} enrichment uses the learned IMDb ID and preserves the search result`, async () => {
		const h = setup({ imdb_id: 'tt100', tmdb_id: null, cast: ['Secondary actor'] });
		const item = { title: 'Ambiguous title', ids: { tmdb_id: 10, imdb_id: null } };
		const result = await h.service.get(type, item);
		assert.deepEqual(h.calls, [['get', 'tt100']]);
		assert.deepEqual(result.cast, ['Primary actor', 'Secondary actor']);
		assert.equal(item.ids.imdb_id, null);
	});
	for(const conflicting of [{ imdb_id: 'tt999', tmdb_id: 10 }, { imdb_id: 'tt100', tmdb_id: 99 }, { imdb_id: null, tmdb_id: null }]) {
		test(`${type} rejects secondary identity ${JSON.stringify(conflicting)}`, async t => {
			t.mock.method(console, 'warn', () => {});
			const h = setup({ ...conflicting, cast: ['Wrong actor'], overview: 'Wrong plot' });
			const result = await h.service.get(type, { ids: { tmdb_id: 10 } });
			assert.deepEqual(result.cast, ['Primary actor']);
			assert.equal(result.overview, undefined);
			assert.equal(result.imdb_id, 'tt100');
		});
	}
	test(`${type} falls back when the primary provider is unavailable`, async () => {
		const h = setup({ imdb_id: 'tt100', tmdb_id: null, title: 'Selected' }, null);
		const result = await h.service.get(type, { ids: { tmdb_id: 10, imdb_id: 'tt100' } });
		assert.equal(result.title, 'Selected');
	});
}
