import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

// Exercise the real adapters and URL builder without contacting providers or
// requiring an Obsidian process. Only Obsidian's HTTP boundary is replaced.
const require = createRequire(import.meta.url);
const { outputFiles } = await build({
	absWorkingDir: fileURLToPath(new URL("../", import.meta.url)),
	stdin: {
		contents: `
			export { BookDataOrchestrator } from './src/chronicle/services/BookDataOrchestrator.ts';
			export { DEFAULT_SETTINGS } from './src/chronicle/settings/DefaultSettings.ts';
			export { MediaSearchModal } from './src/chronicle/ui/MediaSearchModal.ts';
			export * as normalizer from './src/media/services/GoogleBooksNormalizer.ts';
		`,
		resolveDir: fileURLToPath(new URL("../", import.meta.url)),
		loader: "ts",
	},
	bundle: true,
	platform: "node",
	format: "cjs",
	external: ["obsidian"],
	write: false,
});

function setup(respond, overrides = {}) {
	const requests = [];
	const module = { exports: {} };
	const mockedRequire = (name) => name === "obsidian" ? {
		Modal: class { modalEl = { addClass() {} }; },
		requestUrl: async (request) => {
			const url = new URL(request.url);
			requests.push(url);
			const data = url.hostname === "openlibrary.org" ? { docs: [] } : await respond(url);
			return { status: data.httpStatus ?? 200, json: data.body ?? data, text: "" };
		},
	} : require(name);
	new Function("require", "module", "exports", outputFiles[0].text)(mockedRequire, module, module.exports);
	const api = module.exports;
	let settings = { ...api.DEFAULT_SETTINGS, gb_api_key: "test-key", ...overrides };
	let onChanged;
	const service = new api.BookDataOrchestrator({
		getSetting: (key) => settings[key],
		onChanged: (callback) => { onChanged = callback; return {}; },
	});
	return {
		...api, service, settings, requests,
		updateSettings: (updates) => { settings = { ...settings, ...updates }; onChanged(); },
	};
}

const volume = {
	id: "selected-volume",
	volumeInfo: {
		title: "The Hobbit",
		authors: ["J. R. R. Tolkien"],
		publishedDate: "2012-09-18",
		pageCount: 300,
		imageLinks: { thumbnail: "https://example.org/cover.jpg" },
	},
};

test("book searches send Google's plural printType and configured key", async () => {
	const { service, requests } = setup(() => ({ items: [volume] }));
	await service.search("The Hobbit", "book");
	assert.equal(requests.length, 1);
	assert.equal(requests[0].origin, "https://www.googleapis.com");
	assert.equal(requests[0].pathname, "/books/v1/volumes");
	assert.equal(requests[0].searchParams.get("printType"), "books");
	assert.equal(requests[0].searchParams.get("q"), "intitle:The Hobbit");
	assert.equal(requests[0].searchParams.get("key"), "test-key");
});

test("search results retain their Google volume ID and selection fetches that exact volume", async () => {
	const { service, requests } = setup((url) =>
		url.pathname === "/books/v1/volumes" ? { items: [volume] } : volume);
	const results = await service.search("The Hobbit", "book");
	assert.equal(results[0].title, "The Hobbit");
	assert.equal(results[0].primary_artist, "J. R. R. Tolkien");
	assert.equal(results[0].year, "2012");
	assert.equal(results[0].ids.google_library_id, volume.id);
	assert.equal(results[0].ids.open_library_id, null);
	const book = await service.get("book", results[0]);
	assert.equal(book.gb_id, volume.id);
	assert.deepEqual(book.authors, volume.volumeInfo.authors);
	assert.equal(book.pages, 300);
	assert.equal(book.artwork_local, "The Hobbit (2012).jpg");
	assert.equal(book.estimated_word_count, 75000);
	assert.equal("word_count" in book, false);
	assert.equal(requests.length, 3);
	assert.equal(requests[1].pathname, `/books/v1/volumes/${volume.id}`);
	assert.equal(requests[1].searchParams.has("q"), false);
	assert.equal(requests[2].hostname, "openlibrary.org", "selection attempts secondary enrichment");
});

test("Google search and selection work without a key parameter", async () => {
	const { service, requests } = setup((url) =>
		url.pathname === "/books/v1/volumes" ? { items: [volume] } : volume,
		{ gb_api_key: "  " });
	const [selected] = await service.search("The Hobbit", "book");
	assert.equal((await service.get("book", selected)).gb_id, volume.id);
	assert.equal(requests.length, 3);
	assert.ok(requests.every(url => !url.searchParams.has("key")));
});

test("removing a key keeps Google enabled and a replacement key is trimmed", async () => {
	const { service, requests, updateSettings } = setup(() => ({ items: [volume] }));
	updateSettings({ gb_api_key: "" });
	await service.search("The Hobbit", "book");
	assert.equal(requests.length, 1);
	assert.equal(requests[0].searchParams.has("key"), false);
	updateSettings({ gb_api_key: " replacement-key\n" });
	await service.search("The Hobbit", "book");
	assert.equal(requests[1].searchParams.get("key"), "replacement-key");
});

test("Google searches handle a response with no items", async () => {
	const { service } = setup(() => ({ totalItems: 0 }));
	assert.deepEqual(await service.search("No matching title", "book"), []);
});

test("sparse volumes normalize without invalid years or missing-author errors", () => {
	const { normalizer } = setup(() => ({}));
	for (const publishedDate of [undefined, "", "unknown"]) {
		const sparse = { id: "sparse", volumeInfo: { title: "Unknown date", publishedDate } };
		const [result] = normalizer.getSearchResults([sparse]);
		assert.equal(result.year, "");
		assert.equal(result.primary_artist, "");
		assert.equal(normalizer.getBook(sparse, "covers").publication_year, null);
	}
});

test("Google word estimates distinguish missing page counts from zero", () => {
	const { normalizer } = setup(() => ({}));
	for(const [pageCount, expected] of [[undefined, null], [null, null], [0, 0], [1, 250]]) {
		const book = normalizer.getBook({ ...volume, volumeInfo: { ...volume.volumeInfo, pageCount } }, "covers");
		assert.equal(book.estimated_word_count, expected);
	}
});

test("Google word estimates use volume categories as book genres", () => {
	const { normalizer } = setup(() => ({}));
	const book = normalizer.getBook({ ...volume, volumeInfo: {
		...volume.volumeInfo, pageCount: 32, categories: ["Juvenile Fiction / Picture Books"],
	} }, "covers");
	assert.equal(book.estimated_word_count, 800);
});

test("an empty title search falls back to a general search", async () => {
	const { service, requests } = setup(url =>
		url.searchParams.get("q").startsWith("intitle:") ? { totalItems: 0 } : { items: [volume] });
	assert.equal((await service.search(" The Hobbit ", "book"))[0].ids.google_library_id, volume.id);
	assert.deepEqual(requests.map(url => url.searchParams.get("q")), ["intitle:The Hobbit", "The Hobbit"]);
});

test("Google HTTP failures are surfaced when Open Library has no fallback results", async () => {
	for (const status of [400, 403, 429, 503]) {
		const { service, requests } = setup(() => ({ httpStatus: status, body: {} }));
		await assert.rejects(service.search("The Hobbit", "book"), new RegExp(`HTTP ${status}`));
		assert.equal(requests.length, 2);
		assert.equal(requests[1].hostname, "openlibrary.org");
	}
});

test("network errors do not expose the URL or API key", async () => {
	const { service } = setup(url => { throw new Error(`Network failure: ${url}`); });
	await assert.rejects(service.search("The Hobbit", "book"), error => {
		assert.match(error.message, /Could not reach Google Books/);
		assert.equal(error.message.includes("test-key"), false);
		return true;
	});
});

function modalHarness(api, service = api.service) {
	const modal = new api.MediaSearchModal({}, service, "book");
	const statuses = [];
	const rendered = [];
	modal.setStatus = status => statuses.push(status);
	modal.clearResults = () => {};
	modal.renderResults = results => rendered.push(results);
	return { modal, statuses, rendered };
}

test("the search dialog displays quota failures instead of No results", async (t) => {
	t.mock.method(console, "error", () => {});
	const api = setup(() => ({ httpStatus: 429, body: {} }));
	const { modal, statuses } = modalHarness(api);
	await modal.runSearch("The Hobbit", "book");
	assert.match(statuses.at(-1), /Search failed:.*HTTP 429.*quota/);
	assert.equal(statuses.includes("No results."), false);
});

test("an older empty search cannot overwrite newer results", async () => {
	let finishOldSearch;
	const oldSearch = new Promise(resolve => { finishOldSearch = resolve; });
	const api = setup(() => ({}));
	const { modal, statuses, rendered } = modalHarness(api, {
		search: query => query === "old" ? oldSearch : Promise.resolve([volume]),
	});
	const pending = modal.runSearch("old", "book");
	await modal.runSearch("new", "book");
	finishOldSearch([]);
	await pending;
	assert.equal(statuses.at(-1), "Showing 1 results");
	assert.deepEqual(rendered, [[volume]]);
});
