import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const { outputFiles } = await build({
	stdin: { contents: `export { getSeriesSeason } from './src/media/services/TmdbNormalizer.ts';`, resolveDir: process.cwd() },
	bundle: true, platform: 'node', format: 'cjs', external: ['obsidian'], write: false,
});
const module = { exports: {} };
new Function('require', 'module', 'exports', outputFiles[0].text)(name => name === 'obsidian' ? {} : require(name), module, module.exports);
const { getSeriesSeason } = module.exports;
const season = {
	id: 10, name: 'Season 1', season_number: 1, air_date: '2020-01-01', overview: 'A season', vote_average: 8,
	episodes: [{ id: 11, name: 'Pilot', episode_number: 1, season_number: 1, runtime: 45, air_date: '2020-01-01', vote_average: 8, overview: 'First episode' }],
};

test('TMDb seasons without networks inherit series networks and retain episode data', () => {
	const series = { title: 'Show', tmdb_id: 1, imdb_id: 'tt123', networks: ['Network (AU)'] };
	const result = getSeriesSeason(series, season);
	assert.deepEqual(result.networks, ['Network (AU)']);
	assert.notEqual(result.networks, series.networks);
	assert.equal(result.series_tmdb_id, 1);
	assert.equal(result.season_number, 1);
	assert.equal(result.number_of_episodes, 1);
	assert.equal(result.episodes[0].title, 'Pilot');
	assert.equal(result.runtime, 45);
	assert.deepEqual(result.cast, []);
});

test('TMDb seasons support series with no networks and seasons with no episodes', () => {
	const result = getSeriesSeason({ title: 'Show', networks: [] }, { ...season, episodes: [] });
	assert.deepEqual(result.networks, []);
	assert.equal(result.number_of_episodes, 0);
});
