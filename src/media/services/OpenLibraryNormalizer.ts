import { descriptionMarkdown } from "../utilities/descriptionMarkdown.js";
import { SearchResult } from "../models/SearchResult.js";
import { getArtworkLocalPath } from "../utilities/artworkPath.js";
import { Book } from "../models/Book.js";
import { estimateWordCount } from "../utilities/estimateWordCount.js";
import { OpenLibrarySearchResult } from "openlibrary/models/OpenLibrarySearchResult.js";
import { OpenLibraryBook } from "openlibrary/models/OpenLibraryBook.js";

export function getSearchResults(data: OpenLibrarySearchResult[]): SearchResult[]
{
	return data.map(r => ({
		title: r.editions?.docs?.[0]?.title ?? r.title,
		primary_artist: r.author_name?.join(", ") ?? "",
		ids: {
			imdb_id: null,
			tmdb_id: null,
			open_library_id: r.key,
			open_library_edition_id: r.editions?.docs?.[0]?.key ?? r.cover_edition_key ?? null,
			google_library_id: null
		},
		year: r.first_publish_year ? String(r.first_publish_year) : "",
		type: "book",
		artwork: r.cover_i && r.cover_i > 0 ? `https://covers.openlibrary.org/b/id/${r.cover_i}-L.jpg` : null
	}));
}

export function getBook(data: OpenLibraryBook, image_path: string): Book
{
	const year = data.publish_date?.match(/\b(\d{4})\b/)?.[1];
	const publication_year = year ? Number(year) : null;
	const artwork = data.cover_id ? `https://covers.openlibrary.org/b/id/${data.cover_id}-L.jpg` : null;
	const displayYear = publication_year ?? data.first_publish_year;
	const title = `${data.title}${displayYear !== null ? ` (${displayYear})` : ""}`;

	return {
		title: data.title,
		subtitle: data.subtitle,
		edition: data.edition_name ?? null,
		publication_date: data.publish_date,
		publication_year,
		first_publication_year: data.first_publish_year,
		categories: ["[[Books]]"],
		genres: [],
		authors: data.authors,
		pages: data.number_of_pages,
		estimated_word_count: estimateWordCount({ pages: data.number_of_pages, genres: [], subjects: data.subjects }),
		publishers: data.publishers,
		isbn10: data.isbn_10,
		isbn13: data.isbn_13,
		olib_id: data.key.startsWith("/works/") ? data.key : null,
		olib_edition_id: data.edition_key,
		gb_id: null,
		overview: descriptionMarkdown(data.description),
		subjects: data.subjects,
		languages: data.languages,
		artwork,
		artwork_local: getArtworkLocalPath(title, artwork, image_path)
	};
}
