import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { load, JSON_SCHEMA } from "js-yaml";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const { outputFiles } = await build({
	absWorkingDir: root,
	stdin: {
		contents: `
			export { default as Chronicle } from './src/main.ts';
			export { ChronicleSettingTab } from './src/chronicle/settings/ChronicleSettingTab.ts';
			export { DEFAULT_SETTINGS } from './src/chronicle/settings/DefaultSettings.ts';
			export { settingsValidator } from './src/chronicle/settings/validator.ts';
			export { SavedNoteSelectModal } from './src/chronicle/ui/SavedNoteSelectModal.ts';
			export { MediaSearchModal } from './src/chronicle/ui/MediaSearchModal.ts';
			export { NoteManager } from './src/obsidianx/services/NoteManager.ts';
			export { NoteRenderer } from './src/obsidianx/services/NoteRenderer.ts';
			export { VaultFileService } from './src/obsidianx/services/VaultFileService.ts';
			export { BOOK_TEMPLATE } from './src/chronicle/templates/BookTemplate.ts';
			export { getBook } from './src/media/services/GoogleBooksNormalizer.ts';
			export { getCurrentIsoDate } from './src/utilities/Dates.ts';
			export { BookDataOrchestrator } from './src/chronicle/services/BookDataOrchestrator.ts';
		`, resolveDir: root, loader: "ts",
	},
	bundle: true, platform: "node", format: "cjs", external: ["obsidian"], write: false,
});

// Exercise command -> renderer -> note manager -> vault file service. Only
// Obsidian's UI, storage, and frontmatter-edit boundary are replaced in memory.
function setup(settings = {}, volumeInfo = {}, respond = () => { throw new Error("Unexpected HTTP request"); }) {
	const files = new Map();
	const folders = new Set([""]);
	const notices = [];
	const opened = [];
	class TFile { constructor(path, content = "") { this.path = path; this.content = content; } }
	const obsidian = {
		Plugin: class {}, PluginSettingTab: class {}, AbstractInputSuggest: class {},
		Modal: class { modalEl = { addClass() {} }; setTitle() {} }, TFile,
		Notice: class { constructor(text) { notices.push(text); } },
		requestUrl: async request => ({ status: 200, json: await respond(new URL(request.url)) }),
		normalizePath: path => path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/+|\/+$/g, ""),
	};
	const module = { exports: {} };
	new Function("require", "module", "exports", outputFiles[0].text)(
		name => name === "obsidian" ? obsidian : require(name), module, module.exports);
	const api = module.exports;
	function addFile(path, content) {
		const file = new TFile(path, content);
		file.frontmatter = {};
		if(content.startsWith("---\n") && !content.includes("{{")) {
			file.frontmatter = load(content.split("\n---")[0].slice(4), { schema: JSON_SCHEMA });
		}
		files.set(path, file);
		return file;
	}
	const vault = {
		adapter: { exists: async path => folders.has(path) || files.has(path) },
		createFolder: async path => { assert.ok(path); folders.add(path); },
		getAbstractFileByPath: path => files.get(path),
		getMarkdownFiles: () => [...files.values()].filter(file => file.path.endsWith(".md")),
		read: async file => file.content,
		create: async (path, content) => {
			assert.equal(files.has(path), false, "existing note must not be overwritten");
			const parent = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
			assert.ok(folders.has(parent), "parent folder must be created before the note");
			return addFile(path, content);
		},
	};
	const app = {
		vault,
		metadataCache: { getFileCache: file => ({ frontmatter: file.frontmatter }) },
		fileManager: { processFrontMatter: async (file, update) => {
			update(file.frontmatter);
			const body = file.content.slice(file.content.indexOf("\n---") + 4);
			file.content = `---\n${Object.entries(file.frontmatter).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n")}\n---${body}`;
		} },
		workspace: { getLeaf: () => ({ openFile: async file => { opened.push(file.path); } }) },
	};
	const plugin = Object.create(api.Chronicle.prototype);
	plugin.app = app;
	plugin.settings = { ...api.DEFAULT_SETTINGS, book_template_path: "Book Template.md", save_artwork_locally: false, ...settings };
	plugin.settingsService = { validate: mode => api.settingsValidator(plugin.settings, mode) };
	plugin.fileService = new api.VaultFileService(app, vault);
	plugin.note_manager = new api.NoteManager(plugin.fileService);
	let volume = {
		id: "google-volume-one",
		volumeInfo: {
			title: "A Book: A Story", authors: ["Doe, Jane", "Writer: Alex"],
			publishedDate: "2020-01-02", description: "The description.", pageCount: 123,
			industryIdentifiers: [{ type: "ISBN_10", identifier: "0123456789" }],
			imageLinks: { thumbnail: "https://books.google.com/books/content?id=example&img=1" },
			...volumeInfo,
		},
	};
	plugin.bookService = { get: async () => api.getBook(volume, plugin.settings.artwork_output_path) };
	let choice = { type: "book", item: { title: "Selected book" }, mark_complete: true };
	api.MediaSearchModal.prototype.openAndGetChoice = async () => choice;
	let localChoice;
	api.SavedNoteSelectModal.prototype.openAndGetChoice = async function() {
		return localChoice === undefined ? this.notes[0]?.file ?? null : typeof localChoice === 'function' ? localChoice(this.notes) : localChoice;
	};
	addFile("Book Template.md", api.BOOK_TEMPLATE.content);
	return {
		...api, plugin, files, folders, notices, opened, addFile,
		choose: next => { choice = next; },
		chooseLocal: next => { localChoice = next; },
		changeVolume: changes => { volume = { ...volume, ...changes }; },
	};
}

test("book-only users create a read note with metadata despite informational settings warnings", async () => {
	const h = setup({ book_output_path: "Reading/Books", omdb_api_key: "", tmdb_api_key: "", gb_api_key: "", olib_api_key: "" });
	assert.equal(h.plugin.settingsService.validate("book").valid, false);
	let settingsOpened = false;
	h.plugin.openSettings = () => { settingsOpened = true; };
	await h.plugin.addOrUpdateBook();
	const note = h.files.get("Reading/Books/A Book A Story (2020).md");
	assert.ok(note);
	assert.deepEqual(note.frontmatter.read_dates, [h.getCurrentIsoDate()]);
	assert.equal(note.frontmatter.gb_id, "google-volume-one");
	assert.deepEqual(note.frontmatter.authors, ["Doe, Jane", "Writer: Alex"]);
	assert.deepEqual(note.frontmatter.isbn10, ["0123456789"]);
	assert.deepEqual(note.frontmatter.categories, ["[[Books]]"]);
	assert.equal(note.frontmatter.estimated_word_count, 30750);
	assert.equal("word_count" in note.frontmatter, false);
	assert.equal("watch_dates" in note.frontmatter, false);
	assert.match(note.content, /The description\./);
	assert.match(note.content, /!\[Cover\]\(<https:/);
	assert.deepEqual(h.opened, [note.path]);
	assert.equal(settingsOpened, false);
	assert.equal(note.frontmatter.chronicle_template_id, "book-2026-10-25a");
	assert.equal("chronicle_template_version" in note.frontmatter, false);
	assert.equal("chronicle_template_hash" in note.frontmatter, false);
	assert.equal(Object.keys(note.frontmatter)[0], "title");
	assert.deepEqual(Object.keys(note.frontmatter).slice(-1), ["chronicle_template_id"]);
});

test("the book template preserves every book field, including both cover locations", async () => {
	const h = setup();
	const book = {
		title: "A Book #1:",
		subtitle: 'A "quoted" subtitle',
		edition: 'Second edition: "revised"',
		publication_date: "2020-01-02",
		publication_year: 2020,
		first_publication_year: 1990,
		categories: ["[[Books]]", "[[Favourites]]"],
		genres: ["Fiction", "Mystery"],
		authors: ["Doe, Jane", "Writer: Alex"],
		pages: 123,
		estimated_word_count: 30750,
		publishers: ["Publisher: One"],
		isbn10: ["0123456789"],
		isbn13: ["9780140328721"],
		olib_id: "/works/OL1W",
		olib_edition_id: "/books/OL2M",
		gb_id: "google-volume-one",
		overview: "First paragraph.\n\nSecond paragraph.",
		subjects: ["Subject: One"],
		languages: ["en", "fr"],
		artwork: "https://example.org/cover.jpg",
		artwork_local: "Artwork/Book cover.jpg",
	};
	const renderer = new h.NoteRenderer(h.plugin.fileService, "Book Template.md");
	const rendered = await renderer.render({ ...book, read_dates: [] });
	const note = h.addFile("Complete book.md", rendered);
	for(const [key, value] of Object.entries(book)) {
		if(key === "overview") {
			assert.ok(rendered.includes(value));
		} else if(key === "artwork") {
			assert.equal(note.frontmatter.artwork_url, value);
		} else if(key === "artwork_local") {
			assert.equal(note.frontmatter.artwork_local, `[[${value}]]`);
		} else {
			assert.deepEqual(note.frontmatter[key], value, key);
		}
	}
	assert.equal(note.frontmatter.artwork, "[[Artwork/Book cover.jpg]]");
	assert.match(rendered, /!\[\[Artwork\/Book cover\.jpg\]\]/);
});

test("an unread book has an empty read_dates list and an undated filename", async () => {
	const h = setup({ book_output_path: "", switch_to_created_note: false }, { publishedDate: undefined, imageLinks: undefined });
	h.choose({ item: {}, mark_complete: false });
	await h.plugin.addOrUpdateBook();
	const note = h.files.get("A Book A Story.md");
	assert.ok(note);
	assert.deepEqual(note.frontmatter.read_dates, []);
	assert.equal(note.frontmatter.edition, "");
	assert.equal(note.frontmatter.artwork_url, "");
	assert.equal(note.frontmatter.artwork_local, "");
	assert.doesNotMatch(note.content, /!\[Cover\]|!\[\[\]\]/);
	assert.deepEqual(h.opened, []);
});

test("rereads matched after retrieval preserve personal data and do not add newly fetched IDs", async () => {
	const h = setup();
	await h.plugin.addOrUpdateBook();
	const note = h.files.get("Books/A Book A Story (2020).md");
	note.frontmatter.read_dates = ["2001-02-03"];
	note.frontmatter.personal_rating = 5;
	note.content += "\nMy personal thoughts.\n";
	const book = await h.plugin.bookService.get();
	book.olib_id = "/works/OL1W"; book.olib_edition_id = "/books/OL2M";
	h.plugin.bookService.get = async () => ({ ...book });
	await h.plugin.addOrUpdateBook();
	await h.plugin.addOrUpdateBook();
	assert.deepEqual(note.frontmatter.read_dates, ["2001-02-03", h.getCurrentIsoDate()]);
	assert.equal(note.frontmatter.personal_rating, 5);
	assert.equal(note.frontmatter.olib_id, "");
	assert.equal(note.frontmatter.olib_edition_id, "");
	assert.match(note.content, /My personal thoughts\./);
	h.choose({ item: {}, mark_complete: false });
	await h.plugin.addOrUpdateBook();
	assert.deepEqual(note.frontmatter.read_dates, ["2001-02-03", h.getCurrentIsoDate()]);
	assert.equal(h.files.size, 2);
	assert.match(h.notices.at(-1), /^Found book note:/);
});

test("a failed cover download still creates a note using the online image", async (t) => {
	t.mock.method(console, "warn", () => {});
	const h = setup({ save_artwork_locally: true });
	h.plugin.fileService.addFileFromUrl = async () => { throw new Error("offline"); };
	await h.plugin.addOrUpdateBook();
	assert.match(h.files.get("Books/A Book A Story (2020).md").content, /!\[Cover\]\(<https:/);
	assert.equal(h.files.get("Books/A Book A Story (2020).md").frontmatter.artwork_local, "");
	assert.ok(h.notices.some(text => text.includes("online cover")));
});

test("cancelled selections and failed detail retrieval create no note", async () => {
	const h = setup();
	h.choose(null);
	await h.plugin.addOrUpdateBook();
	assert.equal(h.files.size, 1);
	h.choose({ item: {}, mark_complete: true });
	h.plugin.bookService.get = async () => null;
	await h.plugin.addOrUpdateBook();
	assert.equal(h.files.size, 1);
	assert.match(h.notices.at(-1), /Could not retrieve/);
});

test("missing templates and write errors do not report a created note", async (t) => {
	t.mock.method(console, "error", () => {});
	const h = setup({ book_template_path: "Missing.md" });
	await h.plugin.addOrUpdateBook();
	assert.equal(h.files.size, 1);
	assert.equal(h.opened.length, 0);
	h.plugin.settings.book_template_path = "Book Template.md";
	h.plugin.app.vault.create = async () => { throw new Error("write failed"); };
	await h.plugin.addOrUpdateBook();
	assert.match(h.notices.at(-1), /Could not save/);
	assert.equal(h.notices.some(text => text.startsWith("Created")), false);
});

test("export adds the book template even when other reference templates already exist", async () => {
	const h = setup();
	h.files.delete("Book Template.md");
	h.addFile("Movie Template.md", "My customized movie template");
	const tab = Object.create(h.ChronicleSettingTab.prototype);
	tab.plugin = h.plugin;
	await tab.saveTemplates();
	assert.equal(h.files.get("Book Template.md").content, h.BOOK_TEMPLATE.content);
	assert.equal(h.files.get("Movie Template.md").content, "My customized movie template");
	await tab.saveTemplates();
});

test("deleted templates do not render cached content and recreated templates are read", async () => {
	const h = setup();
	h.addFile("Temporary Template.md", 'Original {{ title }}');
	const renderer = new h.NoteRenderer(h.plugin.fileService, "Temporary Template.md");
	assert.equal(await renderer.render({ title: "Movie" }), 'Original Movie');
	h.files.delete("Temporary Template.md");
	assert.equal(await renderer.render({ title: "Movie" }), JSON.stringify({ title: "Movie" }, null, 4));
	h.addFile("Temporary Template.md", 'Recreated {{ title }}');
	assert.equal(await renderer.render({ title: "Movie" }), 'Recreated Movie');
});

test("template boolean fields preserve true and false values and drive conditions", async () => {
	const h = setup();
	h.addFile("Boolean Template.md", '{{ miniseries }}|{{ watched }}|{{#if miniseries}}mini{{else}}series{{/if}}|{{#if watched}}watched{{else}}unwatched{{/if}}|{{ yaml flags }}');
	const renderer = new h.NoteRenderer(h.plugin.fileService, "Boolean Template.md");
	assert.equal(await renderer.render({ miniseries: true, watched: false, flags: { enabled: true, disabled: false } }),
		'true|false|mini|unwatched|{"enabled":true,"disabled":false}');
	assert.equal(await renderer.render({ miniseries: false, watched: true, flags: { enabled: false, disabled: true } }),
		'false|true|series|watched|{"enabled":false,"disabled":true}');
});

test("Open Library search flows through note creation and rereads after a rename", async () => {
	const h = setup({ olib_api_key: "reader@example.org" }, {}, url => {
		if(url.hostname === "www.googleapis.com") return { items: [] };
		assert.equal(url.hostname, "openlibrary.org");
		switch(url.pathname) {
			case "/search.json": return { docs: [{
				key: "/works/OL1W", title: "Open Library Book", author_name: ["An Author"],
				first_publish_year: 1990, editions: { docs: [{ key: "/books/OL2M" }] },
			}] };
			case "/works/OL1W.json": return { key: "/works/OL1W", title: "Open Library Book", description: "A description." };
			case "/books/OL2M.json": return { key: "/books/OL2M", title: "Open Library Book", works: [{ key: "/works/OL1W" }],
				edition_name: 'Second edition: "revised"', publish_date: "2000", number_of_pages: 120, isbn_13: ["9780140328721"] };
			default: throw new Error(`Unexpected path: ${url.pathname}`);
		}
	});
	h.plugin.bookService = new h.BookDataOrchestrator({
		getSetting: key => h.plugin.settings[key], onChanged: () => ({}),
	});
	h.plugin.bookService.olib.requestIntervalMs = 0;
	const [item] = await h.plugin.bookService.search("Open Library Book", "book");
	h.choose({ item, mark_complete: true });
	await h.plugin.addOrUpdateBook();
	const note = h.files.get("Books/Open Library Book (2000).md");
	assert.ok(note);
	assert.equal(note.frontmatter.olib_id, "/works/OL1W");
	assert.equal(note.frontmatter.olib_edition_id, "/books/OL2M");
	assert.equal(note.frontmatter.edition, 'Second edition: "revised"');
	assert.equal(note.frontmatter.pages, 120);
	assert.equal(note.frontmatter.estimated_word_count, 30000);
	assert.deepEqual(note.frontmatter.categories, ["[[Books]]"]);
	assert.deepEqual(note.frontmatter.read_dates, [h.getCurrentIsoDate()]);
	note.frontmatter.read_dates = ["2001-01-01"];
	h.files.delete(note.path);
	note.path = "My renamed book.md";
	h.files.set(note.path, note);
	await h.plugin.addOrUpdateBook();
	assert.deepEqual(note.frontmatter.read_dates, ["2001-01-01", h.getCurrentIsoDate()]);
	assert.equal(h.files.size, 2);
});

test("legacy provider choices are discarded without losing configured services or other settings", async () => {
	for(const saved of [null, {},
		{ olib_api_key: "person@example.org", book_data_source: "google_books" },
		{ gb_api_key: "key", book_data_source: "open_library", book_output_path: "Reading" },
		{ olib_api_key: "person@example.org", gb_api_key: "key", book_data_source: "both" },
	]) {
		const h = setup();
		h.plugin.loadData = async () => saved;
		h.plugin.settingsService.set = () => {};
		let persisted;
		h.plugin.saveData = async settings => { persisted = { ...settings }; };
		await h.plugin.loadSettings();
		assert.equal("book_data_source" in h.plugin.settings, false);
		assert.equal(h.plugin.settings.gb_api_key, saved?.gb_api_key ?? "");
		assert.equal(h.plugin.settings.olib_api_key, saved?.olib_api_key ?? "");
		assert.equal(h.plugin.settings.book_output_path, saved?.book_output_path ?? h.DEFAULT_SETTINGS.book_output_path);
		await h.plugin.saveSettings();
		assert.equal("book_data_source" in persisted, false);
	}
});

test('book notes preserve paragraphs and emphasis from HTML descriptions', async () => {
	const h = setup({}, { description: '<b>Introduction.</b><br><br><i>A quotation.</i><br> <br>First paragraph.<br> <br>Second paragraph.' });
	await h.plugin.addOrUpdateBook();
	const note = h.files.get('Books/A Book A Story (2020).md');
	assert.ok(note.content.includes('**Introduction.**\n\n_A quotation._\n\nFirst paragraph.\n\nSecond paragraph.'));
	assert.doesNotMatch(note.content, /<\/?(?:br|b|i)>/);
});

test('a reread matched from the search result changes only dates without any detail or template work', async () => {
	const h = setup(); await h.plugin.addOrUpdateBook();
	const note = h.files.get('Books/A Book A Story (2020).md');
	note.frontmatter.categories = ['[[Personal]]'];
	note.frontmatter.read_dates = ['1999-01-01'];
	note.content += '\nMy review.';
	const content = note.content.slice(note.content.indexOf('\n---') + 4);
	h.files.get('Book Template.md').content += '\nChanged template';
	const before = { ...note.frontmatter, read_dates: undefined };
	h.files.delete(note.path); note.path = 'Moved/Renamed.md'; h.files.set(note.path, note);
	h.choose({ item: { ids: { google_library_id: 'google-volume-one' } }, mark_complete: true });
	let forbidden = 0;
	const forbid = () => { forbidden++; throw new Error('Unexpected detail/template/artwork access'); };
	h.plugin.bookService.get = forbid;
	h.plugin.prepareArtwork = forbid;
	h.plugin.fileService.readNote = forbid;
	h.plugin.settings.book_template_path = '';
	await h.plugin.addOrUpdateBook(); await h.plugin.addOrUpdateBook();
	assert.equal(forbidden, 0);
	assert.deepEqual(note.frontmatter.read_dates, ['1999-01-01', h.getCurrentIsoDate()]);
	assert.deepEqual({ ...note.frontmatter, read_dates: undefined }, before);
	assert.equal(note.content.slice(note.content.indexOf('\n---') + 4), content);
	assert.equal(h.opened.at(-1), note.path);
	assert.equal([...h.files.values()].filter(file => file.frontmatter.gb_id).length, 1);
});

test('work-only book matches ask which saved edition to update and cancellation changes nothing', async () => {
	const h = setup();
	const first = h.addFile('Books/First.md', '---\ntitle: A Book\nolib_id: /works/OL1W\nolib_edition_id: /books/OL1M\nread_dates: []\n---\nFirst edition');
	const second = h.addFile('Books/Second.md', '---\ntitle: A Book\nolib_id: /works/OL1W\nolib_edition_id: /books/OL2M\nread_dates: []\n---\nSecond edition');
	h.choose({ item: { ids: { open_library_id: '/works/OL1W' } }, mark_complete: true });
	let requests = 0; h.plugin.bookService.get = async () => { requests++; return null; };
	h.chooseLocal(null); await h.plugin.addOrUpdateBook();
	assert.deepEqual(first.frontmatter.read_dates, []); assert.deepEqual(second.frontmatter.read_dates, []);
	h.chooseLocal(notes => { assert.equal(notes.length, 2); return second; });
	await h.plugin.addOrUpdateBook();
	assert.deepEqual(first.frontmatter.read_dates, []);
	assert.deepEqual(second.frontmatter.read_dates, [h.getCurrentIsoDate()]);
	assert.equal(requests, 0);
});

test('unchecked existing books are opened without changing any properties', async () => {
	const h = setup(); await h.plugin.addOrUpdateBook();
	const note = h.files.get('Books/A Book A Story (2020).md');
	const before = note.content;
	h.choose({ item: { ids: { google_library_id: 'google-volume-one' } }, mark_complete: false });
	h.plugin.bookService.get = async () => { throw new Error('Must not fetch'); };
	await h.plugin.addOrUpdateBook();
	assert.equal(note.content, before);
	assert.equal(h.opened.at(-1), note.path);
	assert.match(h.notices.at(-1), /^Found book/);
});

test('long book titles retain the Markdown extension and reuse their note', async () => {
	const h = setup({}, { title: 'A'.repeat(200) });
	await h.plugin.addOrUpdateBook();
	const notes = [...h.files.values()].filter(file => file.path.startsWith('Books/'));
	assert.equal(notes.length, 1);
	assert.ok(notes[0].path.endsWith('.md'));
	await h.plugin.addOrUpdateBook();
	assert.deepEqual([...h.files.values()].filter(file => file.path.startsWith('Books/')), notes);
});

for(const conflict of ['Google volume', 'Open Library edition', 'Open Library only']) {
	test(`${conflict} conflicts cannot update a saved edition through the final lookup`, async () => {
		const h = setup();
		const book = await h.plugin.bookService.get();
		book.olib_id = '/works/OL1W';
		book.olib_edition_id = conflict === 'Google volume' ? null : '/books/OL1M';
		if(conflict === 'Open Library only') book.gb_id = null;
		h.plugin.bookService.get = async () => ({ ...book });
		await h.plugin.addOrUpdateBook();
		const original = h.files.get('Books/A Book A Story (2020).md');
		original.frontmatter.read_dates = ['2000-01-01'];
		original.frontmatter.categories = ['[[Personal]]'];
		original.content += '\nMy review.';
		const before = structuredClone({ content: original.content, frontmatter: original.frontmatter });
		if(conflict === 'Google volume') book.gb_id = 'google-volume-two';
		else book.olib_edition_id = '/books/OL2M';
		h.choose({ item: { ids: { google_library_id: book.gb_id, open_library_id: book.olib_id, open_library_edition_id: book.olib_edition_id } }, mark_complete: true });
		await h.plugin.addOrUpdateBook();
		const notes = [...h.files.values()].filter(file => file.path.startsWith('Books/'));
		assert.equal(notes.length, 2);
		assert.deepEqual({ content: original.content, frontmatter: original.frontmatter }, before);
		const created = notes.find(note => note !== original);
		assert.equal(created.frontmatter.gb_id, book.gb_id ?? '');
		assert.equal(created.frontmatter.olib_edition_id, book.olib_edition_id ?? '');
		assert.deepEqual(created.frontmatter.read_dates, [h.getCurrentIsoDate()]);
		await h.plugin.addOrUpdateBook();
		assert.deepEqual({ content: original.content, frontmatter: original.frontmatter }, before);
		assert.equal([...h.files.values()].filter(file => file.path.startsWith('Books/')).length, 2);
	});
}

test('book filenames remove wiki-link delimiters and sanitized collisions retain distinct notes and covers', async () => {
	const title = 'Book #1 [Revised]^';
	const h = setup({ save_artwork_locally: true, artwork_output_path: 'Artwork' }, { title });
	const downloads = [];
	h.plugin.fileService.addFileFromUrl = async (url, path) => { downloads.push(path); h.addFile(path, `cover ${downloads.length}`); };
	await h.plugin.addOrUpdateBook();
	const first = h.files.get('Books/Book 1 Revised (2020).md');
	assert.ok(first);
	assert.equal(first.frontmatter.title, title);
	assert.ok(first.content.includes(title));
	h.changeVolume({ id: 'google-volume-two', volumeInfo: { title: 'Book 1 Revised', publishedDate: '2020', imageLinks: { thumbnail: 'https://example.org/other.jpg' } } });
	await h.plugin.addOrUpdateBook();
	const second = h.files.get('Books/Book 1 Revised (2020) (google-volume-two).md');
	assert.ok(second);
	assert.deepEqual(downloads, ['Artwork/Book 1 Revised (2020).jpg', 'Artwork/Book 1 Revised (2020) (2).jpg']);
	for(const [index, note] of [first, second].entries()) {
		const cover = note.frontmatter.artwork_local.slice(2, -2);
		assert.equal(cover, downloads[index]);
		assert.equal(note.frontmatter.artwork, note.frontmatter.artwork_local);
		assert.ok(note.content.includes(`![[${cover}]]`));
		assert.equal(h.files.get(cover).content, `cover ${index + 1}`);
	}
	await h.plugin.addOrUpdateBook();
	assert.equal(downloads.length, 2);
	assert.equal(first.frontmatter.title, title);
});
