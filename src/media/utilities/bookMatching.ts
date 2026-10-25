import { Book } from "../models/Book.js";
import { estimateWordCount } from "./estimateWordCount.js";

export function canonicalIsbn(value: string): string | null
{
	const clean = value.replace(/[-\s]/g, "").toUpperCase();

	if(/^\d{13}$/.test(clean))
	{
		return clean;
	}

	if(!/^\d{9}[\dX]$/.test(clean))
	{
		return null;
	}

	const prefix = `978${clean.slice(0, 9)}`;
	const sum = [...prefix].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);

	return `${prefix}${(10 - sum % 10) % 10}`;
}

export function bookIsbns(book: Pick<Book, "isbn10" | "isbn13">): string[]
{
	return [...new Set([...book.isbn13, ...book.isbn10].map(canonicalIsbn).filter((isbn): isbn is string => isbn !== null))];
}

export function sameEdition(a: Book, b: Book): boolean
{
	const ids = new Set(bookIsbns(a));
	return bookIsbns(b).some(isbn => ids.has(isbn));
}

export function sameWork(a: Pick<Book, "title" | "authors">, b: Pick<Book, "title" | "authors">): boolean
{
	const text = (value: string) => value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");

	return !!text(a.title) && text(a.title) === text(b.title)
		&& a.authors.some(author => !!text(author) && b.authors.some(other => text(author) === text(other)));
}

// Shared by search-result lookup and the final save lookup. Conflicting edition
// identifiers must never fall back to a matching work identifier.
export function matchesBookNote(book: Pick<Book, "gb_id" | "olib_id" | "olib_edition_id">, frontmatter: Record<string, unknown>): boolean
{
	const olid = (value: unknown) => typeof value === "string" ? value.replace(/^\/(?:works|books)\//, "") : "";

	if(book.olib_edition_id && frontmatter.olib_edition_id && olid(book.olib_edition_id) !== olid(frontmatter.olib_edition_id))
	{
		return false;
	}

	if(book.gb_id && frontmatter.gb_id)
	{
		return book.gb_id === frontmatter.gb_id;
	}

	if(book.olib_edition_id)
	{
		return olid(book.olib_edition_id) === olid(frontmatter.olib_edition_id);
	}
	return !!book.olib_id && olid(book.olib_id) === olid(frontmatter.olib_id);
}

export function enrichBook(primary: Book, secondary: Book): Book
{
	const exact = sameEdition(primary, secondary);

	if(!exact && !sameWork(primary, secondary))
	{
		return primary;
	}

	const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];
	// Work-level matches can fill work-level fields only. A title/author match
	// must never supply another edition's ISBNs, publisher, pages, or volume ID.
	const result: Book = {
		...primary,
		olib_id: primary.olib_id ?? secondary.olib_id,
		first_publication_year: primary.first_publication_year ?? secondary.first_publication_year,
		overview: primary.overview || secondary.overview,
		subjects: union(primary.subjects, secondary.subjects),
		genres: union(primary.genres, secondary.genres)
	};

	result.estimated_word_count = estimateWordCount(result);

	if(!exact)
	{
		return result;
	}

	const pages = primary.pages ?? secondary.pages;

	return {
		...result,
		gb_id: primary.gb_id ?? secondary.gb_id,
		olib_edition_id: primary.olib_edition_id ?? secondary.olib_edition_id,
		subtitle: primary.subtitle || secondary.subtitle,
		edition: primary.edition ?? secondary.edition,
		publication_date: primary.publication_date ?? secondary.publication_date,
		publication_year: primary.publication_year ?? secondary.publication_year,
		authors: primary.authors.length ? primary.authors : secondary.authors,
		pages,
		estimated_word_count: estimateWordCount({ ...result, pages }),
		publishers: primary.publishers.length ? primary.publishers : secondary.publishers,
		isbn10: union(primary.isbn10, secondary.isbn10),
		isbn13: union(primary.isbn13, secondary.isbn13),
		languages: primary.languages.length ? primary.languages : secondary.languages,
		artwork: primary.artwork || secondary.artwork,
		artwork_local: primary.artwork ? primary.artwork_local : secondary.artwork_local
	};
}
