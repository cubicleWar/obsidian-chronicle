import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const { outputFiles } = await build({
	absWorkingDir: fileURLToPath(new URL("../", import.meta.url)),
	entryPoints: ["src/media/utilities/estimateWordCount.ts"],
	bundle: true, platform: "node", format: "cjs", write: false,
});
const module = { exports: {} };
new Function("module", "exports", outputFiles[0].text)(module, module.exports);
const { estimateWordCount } = module.exports;
const book = (genres = [], subjects = [], pages = 32) => ({ pages, genres, subjects });

test("explicit book formats select the proposed density profiles", () => {
	for(const [label, density] of [
		["Picture books", 25], ["Picture storybooks for children", 25],
		["Early readers", 75], ["Beginning readers", 75], ["Readers / Beginner", 75],
		["Comics & Graphic Novels / Fantasy", 75], ["Manga", 75],
		["Illustrated non-fiction", 150], ["Cookbooks", 150],
		["Textbooks", 350], ["Reference works", 350],
		["Novels", 250], ["Nonfiction", 250],
	]) {
		assert.equal(estimateWordCount(book([label])), 32 * density, label);
		assert.equal(estimateWordCount(book([], [label])), 32 * density, label);
	}
});

test("classification handles case, whitespace, hyphens and taxonomy separators", () => {
	assert.equal(estimateWordCount(book([" Juvenile Fiction / PICTURE-BOOKS "])), 800);
	assert.equal(estimateWordCount(book([], ["Children -- Picture   books"])), 800);
	assert.equal(estimateWordCount(book(["Fiction;Graphic novels"])), 2400);
});

test("specific formats outrank prose and illustrated textbooks avoid the dense-text profile", () => {
	assert.equal(estimateWordCount(book(["Fiction", "Fantasy", "Graphic novels"])), 2400);
	assert.equal(estimateWordCount(book(["Textbooks"], ["Illustrated textbooks"])), 4800);
	assert.equal(estimateWordCount(book(["Picture books"], ["Picture books"])), 800);
});

test("unknown, broad or conflicting labels use the fallback independent of order", () => {
	for(const labels of [[], ["Children's books"], ["Science"], ["History of picture books"],
		["Picture books", "Textbooks"], ["Textbooks", "Picture books"], ["Poetry"]]) {
		assert.equal(estimateWordCount(book(labels)), 8000);
	}
	assert.equal(estimateWordCount({ ...book(), categories: ["Picture books"], title: "Picture books" }), 8000);
});

test("explicitly wordless books have zero estimated words", () => {
	for(const label of ["Wordless picture books", "Wordless books", "Stories without words"]) {
		assert.equal(estimateWordCount(book(["Picture books"], [label])), 0);
	}
	assert.equal(estimateWordCount(book(), { profile: "wordless", wordsPerPage: { wordless: 100 } }), 0);
});

test("page counts must be available, nonnegative safe integers", () => {
	for(const pages of [null, undefined, NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER]) {
		assert.equal(estimateWordCount({ pages, genres: [], subjects: [] }), null);
	}
	assert.equal(estimateWordCount(book(["Picture books"], [], 0)), 0);
	assert.equal(estimateWordCount(book(["Wordless books"], [], null)), null);
});

test("callers can override the profile and density without mutating defaults", () => {
	assert.equal(estimateWordCount(book(), { profile: "picture_book" }), 800);
	assert.equal(estimateWordCount(book(["Picture books"]), { wordsPerPage: { picture_book: 20 } }), 640);
	assert.equal(estimateWordCount(book(), { wordsPerPage: { unknown: 200 } }), 6400);
	assert.equal(estimateWordCount(book([], [], 3), { wordsPerPage: { unknown: 10.5 } }), 32);
	for(const density of [-1, Infinity, NaN]) {
		assert.throws(() => estimateWordCount(book(), { wordsPerPage: { unknown: density } }), RangeError);
	}
	assert.equal(estimateWordCount(book(["Picture books"])), 800);
	assert.equal(estimateWordCount(book()), 8000);
});
