///////////////////////////////////////////////////////////////////////////////////////
// Normalizer functions to convert from the Google Books API format
// to the Chronicle internal format.
///////////////////////////////////////////////////////////////////////////////////////

import { descriptionMarkdown } from "../utilities/descriptionMarkdown.js";
import { SearchResult } from "../models/SearchResult";
import { getArtworkLocalPath } from "../utilities/artworkPath";
import { Book } from "../models/Book.js";
import { estimateWordCount } from "../utilities/estimateWordCount.js";
import { GoogleBooksVolume } from "googlebooks/models/GoogleBooksVolume.js";

function getPublicationYear(publishedDate: string | undefined): number | null
{
	const match = publishedDate?.match(/^(\d{4})(?:-|$)/);
	return match ? Number(match[1]) : null;
}

export function getSearchResults(data: GoogleBooksVolume[]) : SearchResult[]
{
	return data.map(r => {
		const volume = r.volumeInfo;
		const publication_year = getPublicationYear(volume.publishedDate);
		const artwork_path =  volume.imageLinks?.thumbnail ? volume.imageLinks.thumbnail : null;

		return {
			title: volume.title,
			primary_artist: volume.authors?.join(", ") ?? "",
			ids: {
				imdb_id: null,
				tmdb_id: null,
				open_library_id: null,
				google_library_id: r.id
			},
			year: publication_year ? String(publication_year) : "",
			type: "book",
			artwork: artwork_path
		}
	});
}

export function getBook(data: GoogleBooksVolume, image_path: string) : Book
{
	const volume = data.volumeInfo;
	const publication_year = getPublicationYear(volume.publishedDate);
	const full_title = `${volume.title} (${publication_year ?? "n.d."})`;
	const isbn = volume.industryIdentifiers?.filter(i => i.type === "ISBN_10").map(i => i.identifier) ?? [];
	const isbn13 = volume.industryIdentifiers?.filter(i => i.type === "ISBN_13").map(i => i.identifier) ?? [];
	const artwork_path =  data.volumeInfo.imageLinks?.thumbnail ? data.volumeInfo.imageLinks.thumbnail : null;

	return {
		title: volume.title,
		subtitle: volume.subtitle,
		edition: null,
		publication_date: volume.publishedDate ?? null,
		publication_year: publication_year,
		categories: ["[[Books]]"],
		genres: volume.categories ?? [],
		authors: volume.authors ?? [],
		gb_id: data.id,
		pages: volume.pageCount ?? null,
		estimated_word_count: estimateWordCount({ pages: volume.pageCount ?? null, genres: volume.categories ?? [], subjects: [] }),
		publishers: volume.publisher ? [volume.publisher] : [],
		artwork: artwork_path,
		artwork_local: getArtworkLocalPath(full_title, artwork_path, image_path),
		overview: descriptionMarkdown(volume.description ?? null),
		isbn10: isbn,
		isbn13: isbn13,

		// Items not availble in Google Books API
		olib_id: null,
		olib_edition_id: null,
		subjects: [],
		languages: volume.language ? [volume.language] : [],
		first_publication_year: null,
	};
}
