import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const require = createRequire(import.meta.url);
const { outputFiles } = await build({
  stdin: { contents: `export { getMovie, getSeries } from './src/media/services/TmdbNormalizer.ts'; export { toBacklink } from './src/obsidianx/helpers/formatters.ts';`, resolveDir: process.cwd() },
  bundle: true, platform: 'node', format: 'cjs', external: ['obsidian'], write: false,
});
const module = { exports: {} };
new Function('require', 'module', 'exports', outputFiles[0].text)(name => name === 'obsidian' ? {} : require(name), module, module.exports);
const { getMovie, getSeries, toBacklink } = module.exports;
const movie = { title: 'Alpha', release_date: '2020-01-01', poster_path: '/cover.jpg', genres: [], spoken_languages: [], production_countries: [] };

test('TMDb movies preserve their native IMDb ID and accept appended IDs as a fallback', () => {
  assert.equal(getMovie({ ...movie, imdb_id: 'tt123' }, '').imdb_id, 'tt123');
  assert.equal(getMovie({ ...movie, imdb_id: 'tt123', external_ids: { imdb_id: 'tt456' } }, '').imdb_id, 'tt123');
  for (const imdb_id of [null, undefined, '']) {
    assert.equal(getMovie({ ...movie, imdb_id, external_ids: { imdb_id: 'tt456' } }, '').imdb_id, 'tt456');
    assert.equal(getMovie({ ...movie, imdb_id }, '').imdb_id, null);
  }
});

test('TMDb movie covers retain title and year and distinguish movies in the same year', () => {
  assert.equal(getMovie(movie, 'covers').artwork_local, 'covers/Alpha (2020).jpg');
  assert.equal(getMovie({ ...movie, title: 'Beta' }, 'covers').artwork_local, 'covers/Beta (2020).jpg');
  assert.equal(getMovie({ ...movie, release_date: '' }, 'covers').artwork_local, 'covers/Alpha.jpg');
});

test('missing TMDb posters do not produce a local cover or empty embed', () => {
  const result = getMovie({ ...movie, poster_path: null }, 'covers');
  assert.equal(result.artwork, null);
  assert.equal(result.artwork_local, '');
  assert.equal(toBacklink(result.artwork_local, 'embed'), '');
  const series = getSeries({ name: 'Show', poster_path: null, genres: [], spoken_languages: [], production_countries: [], seasons: [], created_by: [], networks: [], status: 'Ended', number_of_seasons: 2 }, 'covers');
  assert.equal(series.artwork, null);
  assert.equal(series.artwork_local, '');
});
