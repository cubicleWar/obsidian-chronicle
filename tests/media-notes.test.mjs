import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { load, JSON_SCHEMA } from 'js-yaml';

const require = createRequire(import.meta.url);
const { outputFiles } = await build({
	stdin: { contents: `
		export { default as Chronicle } from './src/main.ts';
		export { MediaDataOrchestrator } from './src/chronicle/services/MediaDataOrchestrator.ts';
		export { MediaSearchModal } from './src/chronicle/ui/MediaSearchModal.ts';
		export { SavedNoteSelectModal } from './src/chronicle/ui/SavedNoteSelectModal.ts';
		export { SeriesSeasonSelectModal } from './src/chronicle/ui/SeriesSeasonSelectModal.ts';
		export { NoteManager } from './src/obsidianx/services/NoteManager.ts';
		export { VaultFileService } from './src/obsidianx/services/VaultFileService.ts';
		export { DEFAULT_SETTINGS } from './src/chronicle/settings/DefaultSettings.ts';
		export { MOVIE_TEMPLATE } from './src/chronicle/templates/MovieTemplate.ts';
		export { SERIES_TEMPLATE } from './src/chronicle/templates/SeriesTemplate.ts';
		export { SERIES_SEASON_TEMPLATE } from './src/chronicle/templates/SeriesSeasonTemplate.ts';
		export { MINISERIES_TEMPLATE } from './src/chronicle/templates/MiniSeriesTemplate.ts';
		export { getCurrentIsoDate } from './src/utilities/Dates.ts';
	`, resolveDir: fileURLToPath(new URL('../', import.meta.url)) },
	bundle: true, platform: 'node', format: 'cjs', external: ['obsidian'], write: false,
});

// Keep commands, providers, normalizers, rendering and note updates real.
// Replace only Obsidian UI/storage and HTTP boundaries.
function setup(options = {})
{
	const files = new Map(), folders = new Set(['']), requests = [], notices = [], opened = [];
	class TFile { constructor(path, content = '') { this.path = path; this.content = content; this.frontmatter = {}; } }
	const movie = { id: 10, imdb_id: 'tt0010', title: 'A Movie', release_date: '2020-01-02', poster_path: '/movie.jpg', genres: [], spoken_languages: [], production_countries: [], runtime: 100, vote_average: 8, revenue: 1000, overview: 'Movie plot.', credits: { cast: [], crew: [] }, ...options.movie };
	const series = { id: 20, name: 'A Show', type: 'Scripted', status: 'Returning Series', number_of_seasons: 3, number_of_episodes: 6, first_air_date: '2020-01-02', poster_path: '/show.jpg', genres: [], spoken_languages: [], production_countries: [], created_by: [], networks: [{ name: 'Network', origin_country: 'AU' }], external_ids: { imdb_id: 'tt0020' }, seasons: [{ id: 22, name: 'Season 2', season_number: 2, episode_count: 1 }], overview: 'Series plot.', ...options.series };
	const season = { id: 22, name: 'Season 2', season_number: 2, air_date: '2021-01-02', vote_average: 8, overview: 'Season plot.', episodes: [{ id: 23, name: 'The Return', episode_number: 1, season_number: 2, air_date: '2021-01-02', runtime: 45, vote_average: 8, overview: 'Episode plot.' }], ...options.season };
	const obsidian = {
		Plugin: class {}, PluginSettingTab: class {}, AbstractInputSuggest: class {}, TFile,
		Modal: class { modalEl = { addClass() {} }; setTitle() {} },
		Notice: class { constructor(text) { notices.push(text); } },
		normalizePath: path => path.replace(/\/+/g, '/').replace(/^\/+|\/+$/g, ''),
		requestUrl: async request => {
			const url = new URL(request.url); requests.push(url);
			if(url.hostname === 'image.tmdb.org')
			{
				if(options.coverFailure)
				{
					throw new Error('Cover unavailable');
				}

				return { status: 200, arrayBuffer: new ArrayBuffer(4) };
			}
			if(options.providerFailure)
			{
				return { status: 200, json: { success: false, status_code: 7, status_message: 'Unavailable' } };
			}
			if(url.pathname === '/3/search/movie')
			{
				// TMDb movie searches omit IMDb IDs, unlike movie details.
				const { id, title, release_date, poster_path } = movie;
				return { status: 200, json: { results: [{ id, title, release_date, poster_path }] } };
			}
			if(url.pathname === '/3/search/tv')
			{
				const { id, name, first_air_date, poster_path } = series;
				return { status: 200, json: { results: [{ id, name, first_air_date, poster_path }] } };
			}
			if(/^\/3\/movie\/\d+$/.test(url.pathname))
			{
				return { status: 200, json: movie };
			}
			if(/^\/3\/tv\/\d+$/.test(url.pathname))
			{
				return { status: 200, json: series };
			}
			if(/^\/3\/tv\/\d+\/season\/\d+$/.test(url.pathname))
			{
				return { status: 200, json: options.missingSeason ? { success: false, status_code: 34, status_message: 'Not found' } : season };
			}
			throw new Error(`Unexpected request: ${url.pathname}`);
		},
	};
	const module = { exports: {} };
	new Function('require', 'module', 'exports', outputFiles[0].text)(name => name === 'obsidian' ? obsidian : require(name), module, module.exports);
	const api = module.exports;
	function addFile(path, content)
	{
		const file = new TFile(path, content);
		if(content.startsWith('---\n') && !content.includes('{{')) {
			file.frontmatter = load(content.split('\n---')[0].slice(4), { schema: JSON_SCHEMA });
		}
		files.set(path, file); return file;
	}
	const vault = {
		adapter: { exists: async path => folders.has(path) || files.has(path) },
		createFolder: async path => { folders.add(path); },
		getMarkdownFiles: () => [...files.values()].filter(file => file.path.endsWith('.md')),
		getAbstractFileByPath: path => files.get(path), read: async file => file.content,
		create: async (path, content) => {
		assert.ok(!files.has(path), 'notes must not be overwritten');
		assert.ok(folders.has(path.slice(0, path.lastIndexOf('/'))), 'output folder must exist');
		return addFile(path, content);
		},
		createBinary: async (path, data) => { const file = new TFile(path); file.data = data; files.set(path, file); return file; },
		modifyBinary: async (file, data) => { file.data = data; },
	};
	const app = { vault, metadataCache: { getFileCache: file => ({ frontmatter: file.frontmatter }) }, fileManager: { processFrontMatter: async (file, update) => { update(file.frontmatter); } }, workspace: { getLeaf: () => ({ openFile: async file => { opened.push(file.path); } }) } };
	const plugin = Object.create(api.Chronicle.prototype);
	plugin.app = app;
	plugin.settings = { ...api.DEFAULT_SETTINGS, tmdb_api_key: 'test-token', omdb_api_key: '', movie_output_path: 'Media/Movies', series_output_path: 'Media/Series', miniseries_output_path: 'Media/Miniseries', artwork_output_path: 'Covers', movie_template_path: 'Movie.md', series_template_path: 'Series.md', series_season_template_path: 'Season.md', miniseries_template_path: 'Mini.md', save_artwork_locally: false, ...options.settings };
	plugin.settingsService = { getSetting: key => plugin.settings[key], onChanged: () => ({}), validate: () => ({ valid: true }) };
	plugin.fileService = new api.VaultFileService(app, vault);
	plugin.note_manager = new api.NoteManager(plugin.fileService);
	plugin.mediaService = new api.MediaDataOrchestrator(plugin.settingsService);
	let choice = { item: { ids: { tmdb_id: options.type === 'series' ? series.id : movie.id } }, mark_complete: true };
	let selectedSeason = 2, seasonDialogs = 0;
	const seasonLists = [];
	let localChoice;
	api.SavedNoteSelectModal.prototype.openAndGetChoice = async function() {
		if(localChoice !== undefined) return typeof localChoice === 'function' ? localChoice(this.notes) : localChoice;
		return this.notes[0]?.file ?? null;
	};
	api.MediaSearchModal.prototype.openAndGetChoice = async () => choice;
	api.SeriesSeasonSelectModal.prototype.openAndGetChoice = async function() { seasonDialogs++; seasonLists.push(this.series.seasons.map(season => season.season_number)); return selectedSeason; };
	for(const [path, template] of [['Movie.md', api.MOVIE_TEMPLATE], ['Series.md', api.SERIES_TEMPLATE], ['Season.md', api.SERIES_SEASON_TEMPLATE], ['Mini.md', api.MINISERIES_TEMPLATE]]) addFile(path, template.content);
	return { ...api, plugin, files, folders, requests, notices, opened, movie, series, season, seasonLists, addFile,
		choose: value => { choice = value; }, chooseLocal: value => { localChoice = value; }, selectSeason: value => { selectedSeason = value; },
		get seasonDialogs() { return seasonDialogs; },
		notes: () => [...files.values()].filter(file => file.path.startsWith('Media/')),
	};
}

test('movie command fetches details and creates a watched note with IDs and online cover', async () => {
	const h = setup(); await h.plugin.addOrUpdateMovie();
	const note = h.files.get('Media/Movies/A Movie (2020).md');
	assert.ok(note); assert.match(note.content, /imdb_id: "tt0010"/);
	assert.match(note.content, /tmdb_id: 10/); assert.match(note.content, /Movie plot\./);
	assert.match(note.content, /!\[Cover\]\(<https:\/\/image.tmdb.org/);
	assert.deepEqual(note.frontmatter.watch_dates, [h.getCurrentIsoDate()]);
	assert.deepEqual(h.opened, [note.path]);
});

test('TMDb movie search retains title and year without IMDb IDs and selection retrieves details', async () => {
	const h = setup();
	const [result] = await h.plugin.mediaService.search('A Movie', 'movie');
	assert.equal(result.title, 'A Movie');
	assert.equal(result.year, '2020');
	assert.equal(result.type, 'movie');
	assert.equal(result.ids.imdb_id, null);
	assert.equal(result.ids.tmdb_id, 10);
	h.choose({ item: result, mark_complete: true });
	await h.plugin.addOrUpdateMovie();
	assert.match(h.notes()[0].content, /imdb_id: "tt0010"/);
});

test('TMDb movies with no release date still display their title', async () => {
	const h = setup({ movie: { release_date: '' } });
	const [result] = await h.plugin.mediaService.search('A Movie', 'movie');
	assert.equal(result.title, 'A Movie');
	assert.equal(result.year, '');
});

test('TMDb series search retains its name and first-air year', async () => {
	const h = setup({ type: 'series' });
	const [result] = await h.plugin.mediaService.search('A Show', 'series');
	assert.equal(result.title, 'A Show');
	assert.equal(result.year, '2020');
	assert.equal(result.type, 'series');
	assert.equal(result.ids.tmdb_id, 20);
});

test('unwatched movies have no watch dates and respect the open-note setting', async () => {
	const h = setup({ settings: { switch_to_created_note: false } });
	h.choose({ item: { ids: { tmdb_id: 10 } }, mark_complete: false });
	await h.plugin.addOrUpdateMovie();
	assert.deepEqual(h.notes()[0].frontmatter.watch_dates, []); assert.deepEqual(h.opened, []);
});

for(const type of ['movie', 'series'])
{
	test(`${type} cancellation makes no requests or notes`, async () => {
		const h = setup({ type }); h.choose(null);
		await (type === 'movie' ? h.plugin.addOrUpdateMovie() : h.plugin.addOrUpdateSeriesSeason());
		assert.deepEqual(h.requests, []); assert.deepEqual(h.notes(), []);
	});
	test(`${type} provider error creates no note or success notice`, async t => {
		t.mock.method(console, 'warn', () => {});
		const h = setup({ type, providerFailure: true });
		await (type === 'movie' ? h.plugin.addOrUpdateMovie() : h.plugin.addOrUpdateSeriesSeason());
		assert.deepEqual(h.notes(), []); assert.ok(h.notices.some(text => text.includes('Could not retrieve')));
	});
	test(`${type} download failure still creates notes without local cover links`, async t => {
		t.mock.method(console, 'warn', () => {});
		const h = setup({ type, coverFailure: true, settings: { save_artwork_locally: true } });
		await (type === 'movie' ? h.plugin.addOrUpdateMovie() : h.plugin.addOrUpdateSeriesSeason());
		assert.ok(h.notes().length); assert.ok(h.notices.some(text => text.includes('Could not save')));

		for(const note of h.notes())
		{
			assert.doesNotMatch(note.content, /\[\[Covers\//);
		}

		const coveredNote = h.notes().find(note => !note.path.includes('(Season'));
		assert.match(coveredNote.content, /!\[Cover\]\(<https:/);
	});
}

test('movie rendering waits for the local cover to be saved', async () => {
	const h = setup({ settings: { save_artwork_locally: true } });
	const create = h.plugin.note_manager.createOrUpdateNote.bind(h.plugin.note_manager);
	h.plugin.note_manager.createOrUpdateNote = async (movie, ...args) => {
		assert.ok(h.files.has(movie.artwork_local), 'cover must exist before rendering');
		return create(movie, ...args);
	};
	await h.plugin.addOrUpdateMovie();
	assert.match(h.notes()[0].content, /!\[\[Covers\/A Movie \(2020\)\.jpg\]\]/);
	assert.doesNotMatch(h.notes()[0].content, /!\[Cover\]/);
});

test('series command retrieves the selected season and writes linked series and season notes', async () => {
	const h = setup({ type: 'series' }); await h.plugin.addOrUpdateSeriesSeason();
	assert.equal(h.seasonDialogs, 1);
	assert.ok(h.requests.some(url => url.pathname === '/3/tv/20/season/2'));
	const note = h.files.get('Media/Series/A Show (Season 2).md');
	assert.ok(h.files.has('Media/Series/A Show.md'));
	assert.equal('watch_dates' in h.files.get('Media/Series/A Show.md').frontmatter, false);
	assert.deepEqual(note.frontmatter.watch_dates, [h.getCurrentIsoDate()]);
	assert.match(note.content, /series_note: "\[\[Media\/Series\/A Show.md\]\]"/);
	assert.match(note.content, /season: 2/); assert.match(note.content, /The Return/);
	assert.match(note.content, /^# A Show Season 2$/m);
	assert.match(note.content, /Network \(AU\)/); assert.match(note.content, /runtime: 45/);
});

test('cancelling season selection creates no notes and does not fetch a season', async () => {
	const h = setup({ type: 'series', settings: { save_artwork_locally: true } }); h.selectSeason(null);
	await h.plugin.addOrUpdateSeriesSeason();
	assert.deepEqual(h.notes(), []);
	assert.ok(!h.requests.some(url => url.pathname.includes('/season/')));
	assert.ok(!h.requests.some(url => url.hostname === 'image.tmdb.org'));
});

test('miniseries uses the online cover when its local download fails', async t => {
	t.mock.method(console, 'warn', () => {});
	const h = setup({ type: 'series', coverFailure: true, series: { type: 'Miniseries' }, settings: { save_artwork_locally: true, differentiate_miniseries: true } });
	await h.plugin.addOrUpdateSeriesSeason();
	assert.equal(h.notes().length, 1);
	assert.match(h.notes()[0].content, /artwork: "https:\/\/image.tmdb.org/);
	assert.match(h.notes()[0].content, /!\[Cover\]\(<https:/);
	assert.doesNotMatch(h.notes()[0].content, /\[\[Covers\//);
});

test('missing season details create no partial series note', async t => {
	t.mock.method(console, 'warn', () => {});
	const h = setup({ type: 'series', missingSeason: true });
	await h.plugin.addOrUpdateSeriesSeason();
	assert.deepEqual(h.notes(), []); assert.ok(h.notices.some(text => text.includes('Could not retrieve')));
});

test('miniseries bypass season selection and create a combined note', async () => {
	const h = setup({ type: 'series', series: { type: 'Miniseries', number_of_seasons: 1 }, season: { season_number: 1, name: 'Season 1' }, settings: { differentiate_miniseries: true } });
	await h.plugin.addOrUpdateSeriesSeason();
	assert.equal(h.seasonDialogs, 0);
	assert.ok(h.requests.some(url => url.pathname === '/3/tv/20/season/1'));
	assert.equal(h.notes().length, 1);
	const note = h.files.get('Media/Miniseries/A Show.md');
	assert.match(note.content, /The Return/); assert.match(note.content, /Season plot\./);
	assert.deepEqual(note.frontmatter.watch_dates, [h.getCurrentIsoDate()]);
});

test('miniseries can use separate series and season notes', async () => {
	const h = setup({ type: 'series', series: { type: 'Miniseries', number_of_seasons: 1 }, season: { season_number: 1 }, settings: { differentiate_miniseries: false } });
	await h.plugin.addOrUpdateSeriesSeason();
	assert.equal(h.seasonDialogs, 0); assert.equal(h.notes().length, 2);
	assert.ok(h.files.has('Media/Series/A Show (Season 1).md'));
	assert.equal('watch_dates' in h.files.get('Media/Series/A Show.md').frontmatter, false);
	assert.deepEqual(h.files.get('Media/Series/A Show (Season 1).md').frontmatter.watch_dates, [h.getCurrentIsoDate()]);
});

test('missing movie template reports the configuration issue without creating a note', async () => {
	const h = setup(); h.files.delete('Movie.md'); await h.plugin.addOrUpdateMovie();
	assert.deepEqual(h.notes(), []);
	assert.ok(h.notices.some(text => text.includes('template')));
	assert.ok(!h.notices.some(text => text.startsWith('Created new note')));
});

for(const type of ['movie', 'series', 'miniseries']) {
	const options = type => ({ type: type === 'movie' ? 'movie' : 'series', ...(type === 'miniseries' ? { series: { type: 'Miniseries' } } : {}), settings: { save_artwork_locally: true } });
	const run = h => type === 'movie' ? h.plugin.addOrUpdateMovie() : h.plugin.addOrUpdateSeriesSeason();
	test(`${type} separates same-name notes and covers with different IDs`, async () => {
		const h = setup(options(type));
		await run(h);
		const oldNotes = h.notes();
		const oldCover = oldNotes.find(note => note.frontmatter.artwork_local)?.frontmatter.artwork_local;
		if(type === 'movie') { h.movie.id = 99; h.movie.imdb_id = 'tt0099'; }
		else { h.series.id = 99; h.series.external_ids.imdb_id = 'tt0099'; h.season.id = 98; }
		h.choose({ item: { ids: { tmdb_id: 99 } }, mark_complete: true });
		await run(h);
		const newNotes = h.notes().filter(note => !oldNotes.includes(note));
		assert.equal(newNotes.length, oldNotes.length);
		const newCover = newNotes.find(note => note.frontmatter.artwork_local)?.frontmatter.artwork_local;
		assert.notEqual(newCover, oldCover);
		assert.match(newCover, / \(2\)\.jpg\]\]$/);
		assert.equal(h.requests.filter(url => url.hostname === 'image.tmdb.org').length, 2);
		await run(h);
		assert.equal(h.notes().length, oldNotes.length * 2);
		assert.equal(h.requests.filter(url => url.hostname === 'image.tmdb.org').length, 2);
		if(type === 'series') {
			const parent = newNotes.find(note => note.frontmatter.chronicle_template_id === 'series-2026-10-25a');
			assert.equal(newNotes.find(note => note.frontmatter.season).frontmatter.series_note, `[[${parent.path}]]`);
		}
	});

	test(`${type} reports thrown retrieval and write failures without success notices`, async t => {
		t.mock.method(console, 'error', () => {});
		for(const stage of ['retrieve', 'write']) {
			const h = setup(options(type));
			if(stage === 'retrieve') h.plugin.mediaService.get = async () => { throw new Error('offline'); };
			else h.plugin.app.vault.create = async () => { throw new Error('disk full'); };
			await run(h);
			assert.equal(h.notes().length, 0);
			assert.ok(h.notices.some(text => text.startsWith('Could not save')));
			assert.ok(h.notices.every(text => !/^(Created|Updated) /.test(text)));
		}
	});
}

test('a new season links to a renamed series and preserves other seasons', async () => {
	const h = setup({ type: 'series' });
	await h.plugin.addOrUpdateSeriesSeason();
	const parent = h.files.get('Media/Series/A Show.md');
	h.files.delete(parent.path); parent.path = 'Media/Other/My Show.md'; h.files.set(parent.path, parent);
	parent.frontmatter.watch_dates = ['2000-01-01'];
	h.season.season_number = 3; h.season.id = 33; h.selectSeason(3);
	h.series.seasons.push({ id: 33, name: 'Season 3', season_number: 3, episode_count: 1 });
	h.requests.length = 0;
	await h.plugin.addOrUpdateSeriesSeason();
	assert.deepEqual(h.seasonLists, [[2], [2, 3]]);
	assert.deepEqual(h.requests.map(url => url.pathname), ['/3/tv/20', '/3/tv/20/season/3']);
	assert.equal(h.notes().length, 3);
	assert.equal(h.files.get('Media/Series/A Show (Season 3).md').frontmatter.series_note, '[[Media/Other/My Show.md]]');
	assert.deepEqual(parent.frontmatter.watch_dates, ['2000-01-01']);
	assert.deepEqual(h.files.get('Media/Series/A Show (Season 3).md').frontmatter.watch_dates, [h.getCurrentIsoDate()]);
});

test('identical TMDb movie and series IDs do not merge different media types', async () => {
	const h = setup({ series: { id: 10 }, type: 'series' });
	await h.plugin.addOrUpdateSeriesSeason();
	h.choose({ item: { ids: { tmdb_id: 10 } }, mark_complete: true });
	await h.plugin.addOrUpdateMovie();
	assert.equal(h.notes().length, 3);
	assert.equal(h.files.get('Media/Movies/A Movie (2020).md').frontmatter.imdb_id, 'tt0010');
});

test('legacy series notes reuse the poster link and string provider IDs', async () => {
	const h = setup({ type: 'series', settings: { save_artwork_locally: true } });
	h.addFile('Covers/Old Show.jpg', 'image');
	const legacy = h.addFile('Media/Old name.md', '---\ntitle: A Show\ntmdb_id: "20"\nseasons: 3\nposter: "[[Covers/Old Show.jpg]]"\n---\nReview');
	await h.plugin.addOrUpdateSeriesSeason();
	assert.equal(h.notes().length, 2);
	assert.equal(legacy.frontmatter.imdb_id, 'tt0020', 'new identifiers are retained');
	assert.equal(h.requests.filter(url => url.hostname === 'image.tmdb.org').length, 0);
});

test('unidentified occupied filenames are preserved and numeric suffixes skip all collisions', async () => {
	const h = setup({ settings: { save_artwork_locally: true } });
	const original = h.addFile('Media/Movies/A Movie (2020).md', 'Personal note');
	h.addFile('Media/Movies/A Movie (2020) (2).md', 'Another personal note');
	h.addFile('Covers/A Movie (2020).jpg', 'unrelated image');
	h.addFile('Covers/A Movie (2020) (2).jpg', 'another image');
	await h.plugin.addOrUpdateMovie();
	assert.equal(original.content, 'Personal note');
	const note = h.files.get('Media/Movies/A Movie (2020) (3).md');
	assert.equal(note.frontmatter.artwork_local, '[[Covers/A Movie (2020) (3).jpg]]');
});

test('movie templates preserve YAML punctuation, list boundaries and property types', async () => {
	const h = setup({ movie: { title: 'Story #1:', poster_path: null, genres: [{ name: 'True: Stories' }, { name: '#1' }], spoken_languages: [{ english_name: 'English' }, { english_name: 'French' }], credits: { cast: [{ name: 'Doe, Jane' }, { name: 'Actor: Two' }], crew: [{ name: 'Director: One', department: 'Directing' }, { name: 'Writer # One', department: 'Writing' }] } } });
	await h.plugin.addOrUpdateMovie();
	const fm = h.notes()[0].frontmatter;
	assert.equal(fm.title, 'Story #1:');
	assert.deepEqual(fm.genres, ['True: Stories', '#1']);
	assert.deepEqual(fm.languages, ['English', 'French']);
	assert.deepEqual(fm.cast, ['Doe, Jane', 'Actor: Two']);
	assert.deepEqual(fm.writers, ['Writer # One']);
	assert.deepEqual(fm.categories, ['[[Movies]]']);
	assert.equal(fm.director, 'Director: One');
	assert.equal(typeof fm.box_office, 'string');
	assert.equal(typeof fm.runtime, 'number');
	assert.equal(fm.artwork_local, '');
	assert.equal(fm.artwork, '');
	assert.equal(fm.artwork_url, '');
	assert.doesNotMatch(h.notes()[0].content, /!\[Cover\]|!\[\[/);
	assert.deepEqual(fm.countries, []);
});

for(const mini of [false, true]) {
	test(`${mini ? 'miniseries' : 'series'} template writes arrays and common artwork properties`, async () => {
		const h = setup({ type: 'series', series: { name: 'Story #1:', type: mini ? 'Miniseries' : 'Scripted', credits: { cast: [{ name: 'Actor: One' }] }, spoken_languages: [{ english_name: 'English' }], networks: [{ name: 'Network: One', origin_country: 'AU' }] }, settings: { save_artwork_locally: true } });
		await h.plugin.addOrUpdateSeriesSeason();
		const fm = h.notes().find(note => !note.frontmatter.season).frontmatter;
		assert.equal(fm.title, 'Story #1:');
		assert.ok(Array.isArray(fm.cast));
		assert.deepEqual(fm.languages, ['English']);
		assert.deepEqual(fm.networks, ['Network: One (AU)']);
		assert.equal(fm.artwork, fm.artwork_local);
		assert.match(fm.artwork_url, /^https:/);
		assert.ok(h.files.has(fm.artwork_local.slice(2, -2)));
		assert.equal('poster' in fm, false);
		assert.ok(fm.categories.includes('[[TV Series]]'));
	});
}

test('open failures report that the note was saved, without reporting a save failure', async t => {
	t.mock.method(console, 'warn', () => {});
	const h = setup();
	h.plugin.fileService.openNote = async () => { throw new Error('workspace unavailable'); };
	await h.plugin.addOrUpdateMovie();
	assert.equal(h.notes().length, 1);
	assert.ok(h.notices.some(text => text.startsWith('Created movie')));
	assert.ok(h.notices.some(text => text.includes('saved, but could not be opened')));
	assert.ok(h.notices.every(text => !text.startsWith('Could not save')));
});

test('season write failures report the partial save and retries reuse the saved series', async t => {
	t.mock.method(console, 'error', () => {});
	const h = setup({ type: 'series', settings: { save_artwork_locally: true } });
	const create = h.plugin.app.vault.create;
	h.plugin.app.vault.create = async (path, content) => {
		if(path.includes('(Season')) throw new Error('disk full');
		return create(path, content);
	};
	await h.plugin.addOrUpdateSeriesSeason();
	assert.equal(h.notes().length, 1);
	assert.ok(h.notices.some(text => text.includes('already saved')));
	assert.ok(h.notices.every(text => !/^(Created|Updated) /.test(text)));
	h.plugin.app.vault.create = create;
	await h.plugin.addOrUpdateSeriesSeason();
	assert.equal(h.notes().length, 2);
	assert.equal(h.requests.filter(url => url.hostname === 'image.tmdb.org').length, 1);
});

test('legacy movie notes are found by IMDb after moving and keep custom properties', async () => {
	const h = setup();
	const note = h.addFile('Media/Personal/Favourite.md', '---\nimdb_id: tt0010\ndirector: Someone\ncategories: [Personal]\nwatch_dates: ["2000-01-01"]\n---\nMy review');
	await h.plugin.addOrUpdateMovie();
	assert.equal(h.notes().length, 1);
	assert.equal(note.frontmatter.tmdb_id, undefined, 'date-only updates preserve existing metadata');
	assert.deepEqual(note.frontmatter.categories, ['Personal']);
	assert.match(h.notices.at(-1), /^Updated movie/);
});

test('conflicting provider IDs never match even if one ID agrees', async () => {
	const h = setup();
	h.choose({ item: { ids: { tmdb_id: 10, imdb_id: 'tt0010' } }, mark_complete: true });
	const note = h.addFile('Media/Conflicting.md', '---\nimdb_id: tt9999\ntmdb_id: 10\ndirector: Someone\n---\nUnrelated note');
	await h.plugin.addOrUpdateMovie();
	assert.equal(h.notes().length, 2);
	assert.equal(note.frontmatter.imdb_id, 'tt9999');
});

test('known template identity takes precedence over personal properties with media-like names', async () => {
	const h = setup();
	await h.plugin.addOrUpdateMovie();
	const note = h.notes()[0];
	note.frontmatter.season = 'Winter';
	await h.plugin.addOrUpdateMovie();
	assert.equal(h.notes().length, 1);
	assert.equal(note.frontmatter.season, 'Winter');
});

for(const type of ['movie', 'series', 'miniseries']) {
	test(`${type} repeat logging skips season details, artwork, templates and settings validation`, async () => {
		const h = setup({ type: type === 'movie' ? 'movie' : 'series', ...(type === 'miniseries' ? { series: { type: 'Miniseries' } } : {}), settings: { save_artwork_locally: true } });
		const run = () => type === 'movie' ? h.plugin.addOrUpdateMovie() : h.plugin.addOrUpdateSeriesSeason();
		await run();
		const notes = h.notes();
		const coveredNote = notes.find(note => note.frontmatter.artwork_local);
		assert.ok(h.files.has(coveredNote.frontmatter.artwork_local.slice(2, -2)));
		for(const note of notes) {
			note.frontmatter.watch_dates = ['2000-01-01'];
			note.frontmatter.categories = ['[[Personal]]'];
			note.content += '\nMy review.';
			h.files.delete(note.path); note.path = note.path.replace('Media/', 'Media/Renamed/'); h.files.set(note.path, note);
		}
		const snapshots = notes.map(note => ({ ...note.frontmatter, watch_dates: undefined }));
		h.requests.length = 0;
		let forbidden = 0;
		const forbid = () => { forbidden++; throw new Error('Repeat log must skip detail and rendering work'); };
		if(type === 'movie') h.plugin.mediaService.get = forbid;
		h.plugin.mediaService.getSeriesSeason = forbid;
		h.plugin.prepareArtwork = forbid;
		h.plugin.fileService.readNote = forbid;
		h.plugin.settingsService.validate = forbid;
		for(const key of ['movie_template_path', 'series_template_path', 'series_season_template_path', 'miniseries_template_path']) h.plugin.settings[key] = '';
		await run(); await run();
		assert.equal(forbidden, 0);
		assert.deepEqual(h.requests.map(url => url.pathname), type === 'movie' ? [] : ['/3/tv/20', '/3/tv/20']);
		assert.equal(h.seasonDialogs, type === 'series' ? 3 : 0);
		assert.equal(h.notes().length, notes.length);
		assert.match(h.notices.at(-1), /^Updated /);
		for(const [i, note] of notes.entries()) {
			assert.deepEqual(note.frontmatter.watch_dates, note.frontmatter.chronicle_template_id === 'series-2026-10-25a' ? ['2000-01-01'] : ['2000-01-01', h.getCurrentIsoDate()]);
			assert.deepEqual({ ...note.frontmatter, watch_dates: undefined }, snapshots[i]);
			assert.match(note.content, /My review/);
		}
	});
}

test('an unchecked existing movie makes no writes or detail requests', async () => {
	const h = setup(); await h.plugin.addOrUpdateMovie();
	h.requests.length = 0;
	let writes = 0;
	h.plugin.app.fileManager.processFrontMatter = async () => { writes++; };
	h.choose({ item: { ids: { tmdb_id: 10 } }, mark_complete: false });
	await h.plugin.addOrUpdateMovie();
	assert.equal(writes, 0);
	assert.deepEqual(h.requests, []);
	assert.match(h.notices.at(-1), /^Found movie/);
});

test('cancelling the refreshed season picker makes no writes or season requests', async () => {
	const h = setup({ type: 'series' }); await h.plugin.addOrUpdateSeriesSeason();
	const dates = h.notes().map(note => note.frontmatter.watch_dates?.slice());
	h.requests.length = 0; h.selectSeason(null);
	await h.plugin.addOrUpdateSeriesSeason();
	assert.deepEqual(h.requests.map(url => url.pathname), ['/3/tv/20']);
	assert.deepEqual(h.notes().map(note => note.frontmatter.watch_dates), dates);
});

test('logging a saved season leaves duplicate parent notes untouched without asking to choose a parent', async () => {
	const h = setup({ type: 'series' }); await h.plugin.addOrUpdateSeriesSeason();
	const parent = h.files.get('Media/Series/A Show.md');
	const duplicate = h.addFile('Media/Series/Duplicate.md', parent.content);
	const season = h.files.get('Media/Series/A Show (Season 2).md');
	season.frontmatter.watch_dates = [];
	const writes = [];
	const process = h.plugin.app.fileManager.processFrontMatter;
	h.plugin.app.fileManager.processFrontMatter = async (file, update) => { writes.push(file); await process(file, update); };
	let choices = 0;
	h.chooseLocal(() => { choices++; return null; });
	h.requests.length = 0;
	await h.plugin.addOrUpdateSeriesSeason();
	assert.equal(choices, 0);
	assert.deepEqual(writes, [season]);
	assert.equal('watch_dates' in parent.frontmatter, false);
	assert.equal('watch_dates' in duplicate.frontmatter, false);
	assert.deepEqual(season.frontmatter.watch_dates, [h.getCurrentIsoDate()]);
	assert.deepEqual(h.requests.map(url => url.pathname), ['/3/tv/20']);
});

test('duplicate movie IDs ask which note to update without fetching details', async () => {
	const h = setup(); await h.plugin.addOrUpdateMovie();
	const original = h.notes()[0];
	const duplicate = h.addFile('Media/Duplicate.md', original.content);
	original.frontmatter.watch_dates = []; duplicate.frontmatter.watch_dates = [];
	h.requests.length = 0;
	h.chooseLocal(notes => { assert.equal(notes.length, 2); return duplicate; });
	await h.plugin.addOrUpdateMovie();
	assert.deepEqual(original.frontmatter.watch_dates, []);
	assert.deepEqual(duplicate.frontmatter.watch_dates, [h.getCurrentIsoDate()]);
	assert.deepEqual(h.requests, []);
});

for(const type of ['movie', 'series']) {
	test(`long ${type} titles retain Markdown extensions and reuse the existing note`, async () => {
		const title = 'A'.repeat(200);
		const h = setup({ type, movie: { title }, series: { name: title } });
		const run = () => type === 'movie' ? h.plugin.addOrUpdateMovie() : h.plugin.addOrUpdateSeriesSeason();
		await run();
		const notes = h.notes();
		assert.equal(notes.length, type === 'movie' ? 1 : 2);
		for(const note of notes) assert.ok(note.path.endsWith('.md'), note.path);
		await run();
		assert.deepEqual(h.notes(), notes);
		if(type === 'series') {
			h.selectSeason(3); h.season.season_number = 3; h.season.id = 33;
			await run();
			assert.equal(h.notes().length, 3);
			assert.ok(h.notes().some(note => note.path.endsWith(' (Season 3).md')));
		}
	});
}

for(const type of ['movie', 'series']) {
	test(`${type} generated cover and parent links resolve for titles with wiki-link delimiters`, async () => {
		const title = 'Story #1 [Cut]^';
		const h = setup({ type, movie: { title }, series: { name: title }, settings: { save_artwork_locally: true } });
		const run = () => type === 'movie' ? h.plugin.addOrUpdateMovie() : h.plugin.addOrUpdateSeriesSeason();
		await run();
		const parent = h.notes().find(note => !note.frontmatter.season);
		assert.ok(parent);
		assert.equal(parent.frontmatter.title, title);
		assert.ok(parent.content.includes(title));
		assert.doesNotMatch(parent.path, /[#^[\]|]/);
		const cover = parent.frontmatter.artwork_local.slice(2, -2);
		assert.doesNotMatch(cover, /[#^[\]|]/);
		assert.ok(h.files.has(cover));
		assert.ok(parent.content.includes(`![[${cover}]]`));
		if(type === 'series') {
			const season = h.notes().find(note => note.frontmatter.season === 2);
			assert.equal(season.frontmatter.series_note, `[[${parent.path}]]`);
			assert.doesNotMatch(season.path, /[#^[\]|]/);
		}
		await run();
		assert.equal(h.requests.filter(url => url.hostname === 'image.tmdb.org').length, 1);
		assert.equal(h.notes().length, type === 'movie' ? 1 : 2);
	});
}
