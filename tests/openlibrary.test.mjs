import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const { outputFiles } = await build({
	absWorkingDir: root,
	stdin: { contents: `
		export { BookDataOrchestrator } from './src/chronicle/services/BookDataOrchestrator.ts';
		export { DEFAULT_SETTINGS } from './src/chronicle/settings/DefaultSettings.ts';
		export { OpenLibraryClient } from './src/openlibrary/OpenLibraryClient.ts';
		export * as matching from './src/media/utilities/bookMatching.ts';
	`, resolveDir: root, loader: "ts" },
	bundle: true, platform: "node", format: "cjs", external: ["obsidian"], write: false,
});

const searchDoc = {
	key: "/works/OL1W", title: "A Book", author_name: ["Alice Author"],
	first_publish_year: 1988, cover_i: 123,
	editions: { docs: [{ key: "/books/OL2M", title: "A Book" }] },
};
const work = {
	key: "/works/OL1W", title: "A Book", description: { value: "Work description" },
	authors: [{ author: { key: "/authors/OL3A" } }], subjects: ["Fiction"], covers: [123],
};
const edition = {
	key: "/books/OL2M", title: "A Book", works: [{ key: "/works/OL1W" }],
	edition_name: "Second edition",
	authors: [{ key: "/authors/OL3A" }], publish_date: "May 2000", publishers: ["A Publisher"],
	number_of_pages: 240, isbn_10: ["0140328726"], isbn_13: ["9780140328721"],
	languages: [{ key: "/languages/eng" }], covers: [456],
};
const googleVolume = {
	id: "google-book", volumeInfo: {
		title: "A Book", authors: ["Alice Author"], publishedDate: "2000", pageCount: 250,
		industryIdentifiers: [{ type: "ISBN_13", identifier: "9780140328721" }],
	},
};
function fixture(url) {
	if(url.hostname === "www.googleapis.com") {
		return url.pathname.endsWith("/google-book") ? googleVolume : { items: [googleVolume] };
	}
	switch(url.pathname) {
		case "/search.json": return { docs: [searchDoc] };
		case "/works/OL1W.json": return work;
		case "/books/OL2M.json":
		case "/isbn/9780140328721.json": return edition;
		case "/authors/OL3A.json": return { key: "/authors/OL3A", name: "Alice Author" };
		case "/works/OL1W/editions.json": return { entries: [edition] };
		default: throw new Error(`Unexpected request: ${url}`);
	}
}
function setup(respond = fixture, settings = {}, googleResults = false) {
	const requests = [];
	const module = { exports: {} };
	const mockedRequire = name => name === "obsidian" ? {
		requestUrl: async request => {
			const url = new URL(request.url);
			requests.push({ url, headers: request.headers, time: Date.now() });
			const data = !googleResults && url.hostname === "www.googleapis.com" ? { items: [] } : await respond(url);
			return { status: data.httpStatus ?? 200, json: data.body ?? data };
		},
	} : require(name);
	new Function("require", "module", "exports", "window", outputFiles[0].text)(mockedRequire, module, module.exports, { setTimeout });
	const api = module.exports;
	let current = { ...api.DEFAULT_SETTINGS, olib_api_key: "reader@example.org", ...settings };
	let changed;
	const service = new api.BookDataOrchestrator({
		getSetting: key => current[key], onChanged: callback => { changed = callback; return {}; },
	});
	// Tests replace transport timing, not retrieval or normalization logic.
	service.olib.requestIntervalMs = 0;
	return { ...api, service, requests, client: service.olib, update: settings => { current = { ...current, ...settings }; changed(); } };
}

async function selectedBook(h) {
	const [selected] = await h.service.search("A Book", "book");
	return h.service.get("book", selected);
}

test("Open Library fallback search and selection use work and edition endpoints", async () => {
	const h = setup();
	const results = await h.service.search("A Book", "book");
	assert.equal(results[0].ids.open_library_edition_id, "/books/OL2M");
	assert.equal(results[0].primary_artist, "Alice Author");
	assert.match(results[0].artwork, /123-L.jpg$/);
	const book = await h.service.get("book", results[0]);
	assert.equal(book.olib_id, "/works/OL1W");
	assert.equal(book.olib_edition_id, "/books/OL2M");
	assert.equal(book.edition, "Second edition");
	assert.equal(book.gb_id, null);
	assert.equal(book.first_publication_year, 1988);
	assert.equal(book.publication_year, 2000);
	assert.equal(book.pages, 240);
	assert.equal(book.estimated_word_count, 60000);
	assert.equal("word_count" in book, false);
	assert.deepEqual(book.authors, ["Alice Author"]);
	assert.deepEqual(book.isbn10, ["0140328726"]);
	assert.deepEqual(book.publishers, ["A Publisher"]);
	assert.deepEqual(book.languages, ["eng"]);
	assert.equal(book.overview, "Work description");
	assert.match(book.artwork, /456-L.jpg$/);
	assert.equal(book.artwork_local, "A Book (2000).jpg");
	assert.deepEqual(h.requests.filter(r => r.url.hostname === "openlibrary.org").map(r => r.url.pathname), ["/search.json", "/works/OL1W.json", "/books/OL2M.json"]);
	assert.equal(h.requests[0].url.hostname, "www.googleapis.com");
	assert.equal(h.requests[0].url.searchParams.has("key"), false);
	assert.ok(h.requests.find(r => r.url.hostname === "openlibrary.org").url.searchParams.get("fields").includes("cover_i"));
});

test("missing or empty edition names never fall back to provider IDs", async () => {
	for(const edition_name of [undefined, null, "", "   "]) {
		const h = setup(url => url.pathname === "/books/OL2M.json" ? { ...edition, edition_name } : fixture(url));
		const book = await selectedBook(h);
		assert.equal(book.edition, null);
		assert.equal(book.olib_edition_id, "/books/OL2M");
	}
});

test("raw IDs resolve correctly and authors are fetched when search names are absent", async () => {
	const h = setup(url => url.pathname === "/search.json"
		? { docs: [{ ...searchDoc, key: "OL1W", author_name: undefined }] } : fixture(url));
	const book = await selectedBook(h);
	assert.deepEqual(book.authors, ["Alice Author"]);
	assert.ok(h.requests.some(r => r.url.pathname === "/authors/OL3A.json"));
	assert.equal((await h.client.getEdition("OL2M")).key, "/books/OL2M");
});

test("missing edition information falls back to one complete representative edition", async () => {
	const h = setup(url => {
		if(url.pathname === "/search.json") return { docs: [{ ...searchDoc, editions: undefined }] };
		if(url.pathname.endsWith("/editions.json")) return { entries: [{ key: "/books/OL4M", title: "A Book" }, edition] };
		return fixture(url);
	});
	assert.equal((await selectedBook(h)).olib_edition_id, "/books/OL2M");
	assert.equal(h.requests.find(r => r.url.pathname.endsWith("/editions.json")).url.searchParams.get("limit"), "20");
});

test("works without editions or author records still produce a usable partial book", async () => {
	const h = setup(url => {
		if(url.pathname === "/search.json") return { docs: [{ key: "/works/OL1W", title: "A Book" }] };
		if(url.pathname === "/works/OL1W/editions.json") return { entries: [] };
		if(url.pathname === "/authors/OL3A.json") return { httpStatus: 404 };
		return fixture(url);
	});
	const book = await selectedBook(h);
	assert.equal(book.title, "A Book");
	assert.equal(book.pages, null);
	assert.equal(book.estimated_word_count, null);
	assert.equal(book.olib_edition_id, null);
	assert.deepEqual(book.authors, []);
	assert.deepEqual(book.isbn13, []);
});

test("a supplemental outage preserves the selected work", async t => {
	t.mock.method(console, "warn", () => {});
	const h = setup(url => url.pathname.startsWith("/books/") || url.pathname.endsWith("/editions.json")
		? { httpStatus: 503 } : fixture(url));
	const book = await selectedBook(h);
	assert.equal(book.olib_id, "/works/OL1W");
	assert.equal(book.olib_edition_id, null);
	assert.deepEqual(book.authors, ["Alice Author"]);
});

test("Open Library failures are surfaced rather than reported as no matches", async () => {
	const h = setup(() => ({ httpStatus: 429 }));
	await assert.rejects(h.service.search("A Book", "book"), /Open Library.*429/);
});

test("repeated and concurrent requests use the cache and survive unrelated settings changes", async () => {
	const h = setup();
	await Promise.all([h.client.getWork("OL1W"), h.client.getWork("/works/OL1W")]);
	h.update({ artwork_output_path: "Covers" });
	await h.service.olib.getWork("OL1W");
	assert.equal(h.requests.length, 1);
});

test("search failures always reject with an Error and preserve the original cause", async () => {
	for(const failure of [new Error("Provider unavailable"), "Provider unavailable", null, undefined]) {
		const h = setup();
		h.client.search = async () => { throw failure; };
		await assert.rejects(h.service.search("A Book", "book"), error => {
			assert.ok(error instanceof Error);
			if(failure instanceof Error) {
				assert.equal(error, failure);
			} else {
				assert.equal(error.message, "Book search failed.");
				assert.equal(error.cause, failure);
			}
			return true;
		});
	}
});

test("Open Library caches evict their oldest entries at capacity", async () => {
	const docs = Array.from({ length: 101 }, (_, index) => ({ ...searchDoc, key: `/works/OL${index + 1}W` }));
	const h = setup(url => url.pathname === "/search.json" ? { docs } : { key: url.pathname });
	await h.client.search("A Book");
	assert.equal(h.client.searchResults.size, 100);
	assert.equal(h.client.searchResults.has("/works/OL1W"), false);
	assert.equal(h.client.searchResults.has("/works/OL101W"), true);
	for(let i = 1; i <= 201; i++) await h.client.getWork(`OL${i}W`);
	assert.equal(h.client.cache.size, 200);
	const requests = h.requests.length;
	await h.client.getWork("OL201W");
	assert.equal(h.requests.length, requests, "newest request is still cached");
	await h.client.getWork("OL1W");
	assert.equal(h.requests.length, requests + 1, "oldest request must be fetched again");
});

test("request queue spaces distinct requests", async () => {
	const h = setup();
	h.client.requestIntervalMs = 35;
	await Promise.all([h.client.getWork("OL1W"), h.client.getEdition("OL2M")]);
	assert.ok(h.requests[1].time - h.requests[0].time >= 30);
});

test("optional contact is sent only as identification, not an API key", async () => {
	const h = setup(fixture, { olib_api_key: " contact@example.org " });
	await h.service.search("A Book", "book");
	assert.equal(h.requests.find(r => r.url.hostname === "openlibrary.org").headers["User-Agent"], "Obsidian Chronicle (contact@example.org)");
	assert.equal(h.requests[0].url.searchParams.has("key"), false);
});

test("both providers search Google first then enrich by verified ISBN", async () => {
	const h = setup(fixture, { gb_api_key: "test-key" }, true);
	const [selected] = await h.service.search("A Book", "book");
	assert.equal(h.requests.length, 1);
	assert.equal(selected.ids.google_library_id, "google-book");
	const book = await h.service.get("book", selected);
	assert.equal(book.gb_id, "google-book");
	assert.equal(book.olib_id, "/works/OL1W");
	assert.equal(book.olib_edition_id, "/books/OL2M");
	assert.equal(book.pages, 250, "selected provider's page count wins");
	assert.equal(book.edition, "Second edition");
	assert.equal(book.estimated_word_count, 62500);
	assert.equal(book.overview, "Work description");
	assert.ok(h.requests.some(r => r.url.pathname === "/isbn/9780140328721.json"));
});

test("empty Google search falls back to Open Library and enriches in the reverse direction", async () => {
	const h = setup(url => {
		if(url.hostname === "www.googleapis.com" && url.pathname.endsWith("/volumes") && !url.searchParams.get("q").startsWith("isbn:")) return { totalItems: 0 };
		return fixture(url);
	}, { gb_api_key: "test-key" }, true);
	const book = await selectedBook(h);
	assert.equal(book.olib_edition_id, "/books/OL2M");
	assert.equal(book.gb_id, "google-book");
	assert.equal(book.pages, 240);
	assert.equal(book.estimated_word_count, 60000);
	assert.equal(book.publication_date, "May 2000");
});

test("Open Library word estimates distinguish missing page counts from zero", async () => {
	for(const [number_of_pages, expected] of [[undefined, null], [null, null], [0, 0], [1, 250]]) {
		const h = setup(url => url.pathname === "/books/OL2M.json"
			? { ...edition, number_of_pages } : fixture(url));
		assert.equal((await selectedBook(h)).estimated_word_count, expected);
	}
});

test("Open Library word estimates use work subjects", async () => {
	const h = setup(url => url.pathname === "/works/OL1W.json"
		? { ...work, subjects: ["Graphic novels"] } : fixture(url));
	assert.equal((await selectedBook(h)).estimated_word_count, 240 * 75);
});

test("enrichment recalculates estimates when only classification metadata changes", async () => {
	for(const exactEdition of [true, false]) {
		const h = setup(url => {
			if(url.pathname === "/works/OL1W.json") return { ...work, subjects: ["Graphic novels"] };
			if(!exactEdition && url.pathname.startsWith("/isbn/")) return { httpStatus: 404 };
			if(!exactEdition && url.pathname === "/books/OL2M.json") return { ...edition, isbn_10: [], isbn_13: [] };
			return fixture(url);
		}, { gb_api_key: "test-key" }, true);
		const book = await selectedBook(h);
		assert.equal(book.pages, 250, "retain the selected edition's pages");
		assert.equal(book.estimated_word_count, 250 * 75);
		assert.equal(book.olib_edition_id, exactEdition ? "/books/OL2M" : null);
	}
});

test("enrichment estimates words from the final page count in either provider direction", async () => {
	for(const primary of ["google", "open_library"]) {
		for(const secondaryPages of [null, 0, 120]) {
			const h = setup(url => {
				if(url.hostname === "www.googleapis.com") {
					if(primary === "open_library" && url.pathname.endsWith("/volumes") && !url.searchParams.get("q").startsWith("isbn:")) {
						return { totalItems: 0 };
					}
					const volume = { ...googleVolume, volumeInfo: { ...googleVolume.volumeInfo,
						pageCount: primary === "google" ? undefined : secondaryPages } };
					return url.pathname.endsWith("/google-book") ? volume : { items: [volume] };
				}
				if(url.pathname === "/books/OL2M.json" || url.pathname.startsWith("/isbn/")) {
					return { ...edition, number_of_pages: primary === "open_library" ? undefined : secondaryPages };
				}
				return fixture(url);
			}, { gb_api_key: "test-key" }, true);
			const book = await selectedBook(h);
			assert.equal(book.pages, secondaryPages);
			assert.equal(book.estimated_word_count, secondaryPages === null ? null : secondaryPages * 250);
		}
	}
});

test("matching by title and author fills work metadata but never a different edition's fields", async () => {
	const h = setup(url => {
		if(url.pathname.startsWith("/isbn/")) return { httpStatus: 404 };
		if(url.pathname === "/books/OL2M.json") return { ...edition, isbn_10: [], isbn_13: ["9780000000002"] };
		return fixture(url);
	}, { gb_api_key: "test-key" }, true);
	const book = await selectedBook(h);
	assert.equal(book.overview, "Work description");
	assert.equal(book.olib_id, "/works/OL1W");
	assert.equal(book.olib_edition_id, null);
	assert.equal(book.pages, 250);
	assert.deepEqual(book.publishers, []);
	assert.equal(book.edition, null, "a different edition's name must not be copied");
	assert.deepEqual(book.isbn13, ["9780140328721"]);
});

test("same-title different-author matches are not merged", async () => {
	const h = setup(url => {
		if(url.pathname.startsWith("/isbn/")) return { httpStatus: 404 };
		if(url.pathname === "/search.json") return { docs: [{ ...searchDoc, author_name: ["Someone Else"] }] };
		return fixture(url);
	}, { gb_api_key: "test-key" }, true);
	const book = await selectedBook(h);
	assert.equal(book.olib_id, null);
	assert.equal(book.overview, null);
});

test("equivalent ISBN-10 and ISBN-13 identify the same edition", () => {
	const { matching } = setup();
	assert.equal(matching.canonicalIsbn("0-14-032872-6"), "9780140328721");
	assert.equal(matching.canonicalIsbn("not an isbn"), null);
});

for(const [label, settings] of [
	['whitespace-only credentials', { gb_api_key: ' \n', olib_api_key: '\t ' }],
	['Google only', { gb_api_key: ' test-key ', olib_api_key: '' }],
	['Open Library only', { gb_api_key: ' ', olib_api_key: ' reader@example.org ' }],
]) {
	test(`both book providers remain active: ${label}`, async () => {
		const h = setup(fixture, settings, true);
		assert.ok(await selectedBook(h));
		assert.deepEqual([...new Set(h.requests.map(r => r.url.hostname))], ['www.googleapis.com', 'openlibrary.org']);
		const google = h.requests.find(r => r.url.hostname === 'www.googleapis.com');
		if(google) assert.equal(google.url.searchParams.get('key'), settings.gb_api_key.trim() || null);
	});
}

test('credential changes affect requests without disabling either book service', async () => {
	const h = setup(fixture, {}, true);
	for(const settings of [
		{ gb_api_key: '', olib_api_key: '' },
		{ gb_api_key: ' key ', olib_api_key: ' reader@example.org ' },
		{ gb_api_key: '', olib_api_key: '' },
	]) {
		h.update(settings);
		h.requests.length = 0;
		h.service.olib.requestIntervalMs = 0;
		assert.ok(await selectedBook(h));
		assert.deepEqual([...new Set(h.requests.map(r => r.url.hostname))], ['www.googleapis.com', 'openlibrary.org']);
		const google = h.requests.find(r => r.url.hostname === 'www.googleapis.com');
		assert.equal(google.url.searchParams.get('key'), settings.gb_api_key.trim() || null);
		const olib = h.requests.find(r => r.url.hostname === 'openlibrary.org');
		assert.equal(olib.headers['User-Agent'], settings.olib_api_key.trim() ? 'Obsidian Chronicle (reader@example.org)' : undefined);
	}
});

test('Open Library fallback and book retrieval work with no credentials when Google fails', async t => {
	t.mock.method(console, 'warn', () => {});
	const h = setup(url => url.hostname === 'www.googleapis.com' ? { httpStatus: 429 } : fixture(url), { gb_api_key: '', olib_api_key: '' }, true);
	const book = await selectedBook(h);
	assert.equal(book.olib_edition_id, '/books/OL2M');
	assert.equal(book.gb_id, null);
	assert.equal(book.title, 'A Book');
	assert.ok(h.requests.some(r => r.url.hostname === 'www.googleapis.com'));
	assert.ok(h.requests.some(r => r.url.hostname === 'openlibrary.org'));
	assert.ok(h.requests.every(r => !r.url.searchParams.has('key')));
	assert.ok(h.requests.filter(r => r.url.hostname === 'openlibrary.org').every(r => !r.headers['User-Agent']));
});

test('Open Library HTML descriptions retain paragraph boundaries in normalized books', async () => {
	const h = setup(url => url.pathname === '/works/OL1W.json' ? { ...work, description: { value: '<p>First paragraph.</p><p>Second paragraph.</p>' } } : fixture(url));
	assert.equal((await selectedBook(h)).overview, 'First paragraph.\n\nSecond paragraph.');
});
