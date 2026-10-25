import type { Book } from "../models/Book.js";

type WordCountProfile = "wordless" | "picture_book" | "early_reader" | "graphic_novel"
	| "illustrated_nonfiction" | "prose" | "textbook" | "unknown";

export interface WordCountOptions
{
	profile?: WordCountProfile;
	wordsPerPage?: Partial<Record<WordCountProfile, number>>;
}

// Starting heuristics, not measured averages. Callers can calibrate these rates.
const DEFAULT_WORDS_PER_PAGE: Readonly<Record<WordCountProfile, number>> = Object.freeze({
	wordless: 0,
	picture_book: 25,
	early_reader: 75,
	graphic_novel: 75,
	illustrated_nonfiction: 150,
	prose: 250,
	textbook: 350,
	unknown: 250
});

type BookWordCountInput = Pick<Book, "pages" | "genres" | "subjects">;

function classifyBook(book: BookWordCountInput): WordCountProfile
{
	// Match taxonomy segments, not arbitrary words in titles or descriptions.
	const labels = [...book.genres, ...book.subjects].flatMap(label => label
		.normalize("NFKC").toLowerCase()
		.replace(/\breaders\s*\/\s*(beginner|beginning|early)\b/g, "readers $1")
		.split(/\s*(?:\/|--|;)\s*/)
		.map(part => part.replace(/-/g, " ").replace(/\s+/g, " ").trim()));
	const matches = (pattern: RegExp) => labels.some(label => pattern.test(label));

	if(matches(/^(?:wordless (?:books?|picture books?|stories)|stories without words)$/))
	{
		return "wordless";
	}

	const profiles: WordCountProfile[] = [];

	if(matches(/^(?:picture books?|picture storybooks?)(?: for children)?$/))
	{
		profiles.push("picture_book");
	}

	if(matches(/^(?:early readers?|beginning readers?|easy readers?|readers,? (?:beginner|beginning|early))$/))
	{
		profiles.push("early_reader");
	}

	if(matches(/^(?:comics?(?: & graphic novels?)?|graphic novels?|comic books?|manga)$/))
	{
		profiles.push("graphic_novel");
	}

	const illustrated = matches(/^(?:illustrated non ?fiction|illustrated (?:guides?|textbooks?|reference books?)|cookbooks?|cookery)$/);

	if(illustrated)
	{
		profiles.push("illustrated_nonfiction");
	}

	if(!illustrated && matches(/^(?:textbooks?|reference (?:books?|works?))$/))
	{
		profiles.push("textbook");
	}

	// Specific formats outrank broad fiction labels; conflicting formats use the fallback.
	if(profiles.length > 1)
	{
		return "unknown";
	}

	if(profiles[0])
	{
		return profiles[0];
	}

	if(matches(/^(?:fiction|non ?fiction|novels?|prose|general prose)$/))
	{
		return "prose";
	}

	return "unknown";
}

export function estimateWordCount(book: BookWordCountInput, options: WordCountOptions = {}): number | null
{
	const { pages } = book;

	if(pages == null || !Number.isSafeInteger(pages) || pages < 0)
	{
		return null;
	}

	const profile = options.profile ?? classifyBook(book);
	// Wordless books remain zero even if a caller overrides the density defaults.
	const density = profile === "wordless" ? 0 : options.wordsPerPage?.[profile] ?? DEFAULT_WORDS_PER_PAGE[profile];

	if(!Number.isFinite(density) || density < 0)
	{
		throw new RangeError("Words per page must be finite and nonnegative.");
	}

	const estimate = Math.round(pages * density);

	return Number.isSafeInteger(estimate) ? estimate : null;
}
