import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { outputFiles } = await build({
	stdin: { contents: `
		export { MediaDataOrchestrator } from './src/chronicle/services/MediaDataOrchestrator.ts';
		export { mergeObjects } from './src/utilities/entity-unify/merge.ts';
		export { makeFingerprint } from './src/utilities/entity-unify/fingerprint.ts';
		export { resolveFingerprintSpecs } from './src/media/utilities/resolveFingerprintSpecs.ts';
	`, resolveDir: fileURLToPath(new URL('../', import.meta.url)) },
	bundle: true, platform: 'node', format: 'cjs', external: ['obsidian'], write: false,
});
const series = { title: 'Show', tmdb_id: 20, imdb_id: 'tt20', networks: ['Network'], cast: [], miniseries: false };
const tmdbEpisode = (n, changes = {}) => ({ id: 100 + n, name: `Episode ${n}`, episode_number: n, season_number: 1, runtime: null, overview: '', air_date: '2020-01-01', ...changes });
const omdbEpisode = (n, changes = {}) => ({ imdbID: `tt${100 + n}`, Title: `Episode ${n}`, Episode: String(n), Runtime: '45 min', Released: '01 Jan 2020', Plot: `Enriched plot ${n}`, imdbRating: '8', ...changes });

function setup(options = {}) {
	const tmdb = options.tmdb === undefined ? [tmdbEpisode(1), tmdbEpisode(2)] : options.tmdb;
	const omdb = options.omdb === undefined ? [omdbEpisode(1), omdbEpisode(2)] : options.omdb;
	const requests = [];
	const obsidian = { requestUrl: async request => {
		const url = new URL(request.url); requests.push(url);
		if(url.pathname === '/3/tv/20/season/1') return { status: 200, json: tmdb === null
			? { success: false, status_code: 34, status_message: 'Unavailable' }
			: { id: 22, name: 'Season 1', season_number: 1, overview: '', air_date: '2020-01-01', episodes: tmdb } };
		assert.equal(url.hostname, 'www.omdbapi.com');
		if(url.searchParams.has('season')) return { status: 200, json: omdb === null
			? { Response: 'False', Error: 'Unavailable' }
			: { Season: '1', Episodes: omdb.map(episode => ({ imdbID: episode.imdbID })) } };
		const episode = omdb.find(episode => episode.imdbID === url.searchParams.get('i'));
		assert.ok(episode, 'unexpected episode request');
		return { status: 200, json: episode };
	} };
	const module = { exports: {} };
	new Function('require', 'module', 'exports', outputFiles[0].text)(name => name === 'obsidian' ? obsidian : require(name), module, module.exports);
	const settings = { tmdb_api_key: 'tmdb-token', omdb_api_key: options.tmdbOnly ? '' : 'omdb-token', artwork_output_path: '' };
	const service = new module.exports.MediaDataOrchestrator({ getSetting: key => settings[key], onChanged: () => ({}) });
	return { ...module.exports, service, requests };
}

test('both providers preserve different episodes sharing a title', async () => {
	const h = setup({ tmdb: [tmdbEpisode(1, { name: 'Same title' }), tmdbEpisode(2, { name: 'Same title' })], omdb: [omdbEpisode(1, { Title: 'Same title' }), omdbEpisode(2, { Title: 'Same title' })] });
	const result = await h.service.getSeriesSeason(series, 1);
	assert.deepEqual(result.episodes.map(episode => episode.episode_number), [1, 2]);
	assert.deepEqual(result.episodes.map(episode => episode.imdb_id), ['tt101', 'tt102']);
	assert.equal(result.number_of_episodes, 2);
	assert.equal(result.runtime, 90);
	assert.equal(result.episode_table.split('\n').length, 4);
});

test('enrichment rebuilds totals and the table, even when providers use different episode titles', async () => {
	const h = setup({ omdb: [omdbEpisode(1, { Title: 'Alternate title', Runtime: '40 min' }), omdbEpisode(2, { Runtime: '50 min' })] });
	const result = await h.service.getSeriesSeason(series, 1);
	assert.equal(result.number_of_episodes, 2);
	assert.deepEqual(result.episodes.map(episode => episode.runtime), [40, 50]);
	assert.equal(result.episodes[0].title, 'Episode 1', 'primary title retains precedence');
	assert.equal(result.runtime, 90);
	assert.equal(result.average_runtime, 45);
	assert.match(result.episode_table, /40/);
	assert.match(result.episode_table, /50/);
	assert.match(result.episode_table, /Enriched plot 1/);
	assert.doesNotMatch(result.episode_table, /null/);
	const mini = h.service.generateMiniseries({ ...series, miniseries: true }, result);
	assert.equal(mini.runtime, 90);
	assert.equal(mini.number_of_episodes, 2);
	assert.equal(mini.episode_table, result.episode_table);
});

test('episodes contributed by the secondary provider are counted and ordered', async () => {
	const h = setup({ tmdb: [tmdbEpisode(3, { runtime: 45 }), tmdbEpisode(1, { runtime: 45 })], omdb: [omdbEpisode(2)] });
	const result = await h.service.getSeriesSeason(series, 1);
	assert.deepEqual(result.episodes.map(episode => episode.episode_number), [1, 2, 3]);
	assert.equal(result.number_of_episodes, 3);
	assert.equal(result.runtime, 135);
	assert.equal(result.episode_table.split('\n').length, 5);
});

test('an empty primary episode list receives the secondary episodes and derived fields', async () => {
	const h = setup({ tmdb: [] });
	const result = await h.service.getSeriesSeason(series, 1);
	assert.equal(result.number_of_episodes, 2);
	assert.equal(result.runtime, 90);
	assert.match(result.episode_table, /Enriched plot 2/);
});

test('single-provider and empty seasons retain consistent summaries without literal null runtimes', async () => {
	const h = setup({ tmdbOnly: true });
	const result = await h.service.getSeriesSeason(series, 1);
	assert.equal(result.number_of_episodes, 2);
	assert.equal(result.runtime, 0);
	assert.equal(result.average_runtime, 0);
	assert.doesNotMatch(result.episode_table, /null/);
	assert.equal(h.requests.length, 1);
	const empty = await setup({ tmdb: [], omdb: [] }).service.getSeriesSeason(series, 1);
	assert.equal(empty.number_of_episodes, 0);
	assert.equal(empty.runtime, 0);
	assert.equal(empty.episode_table, '');
});

test('an unavailable primary provider falls back, and no providers returning data yields null', async t => {
	t.mock.method(console, 'warn', () => {});
	const result = await setup({ tmdb: null }).service.getSeriesSeason(series, 1);
	assert.equal(result.number_of_episodes, 2);
	assert.equal(result.runtime, 90);
	assert.equal(await setup({ tmdb: null, omdb: null }).service.getSeriesSeason(series, 1), null);
});

test('episode identity uses numbered positions or namespaced IDs, never titles alone', () => {
	const h = setup();
	const fingerprint = h.makeFingerprint(h.resolveFingerprintSpecs);
	for(const nested of [false, true]) {
		const wrap = episodes => nested ? { seasons: [{ title: 'Season', episodes }] } : { episodes };
		const merge = (a, b) => {
			const merged = h.mergeObjects([wrap(a), wrap(b)], fingerprint);
			return nested ? merged.seasons[0].episodes : merged.episodes;
		};
		assert.equal(merge([{ title: 'Same', season_number: 0, episode_number: 1 }], [{ title: 'Different', season_number: 0, episode_number: 1 }]).length, 1);
		assert.equal(merge([{ title: 'Same', season_number: 1, episode_number: 1 }], [{ title: 'Same', season_number: 2, episode_number: 1 }]).length, 2);
		assert.equal(merge([{ title: 'Same', season_number: -1, episode_number: -1 }], [{ title: 'Same', season_number: -1, episode_number: -1 }]).length, 2);
		assert.equal(merge([{ title: 'First', tmdb_id: 10 }], [{ title: 'Other', tmdb_id: 10 }]).length, 1);
		assert.equal(merge([{ title: 'Same', tmdb_id: 10 }], [{ title: 'Same', imdb_id: '10' }]).length, 2);
	}
});
