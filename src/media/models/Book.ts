import { ArtworkOwner } from "./ArtworkOwner.js";

export interface Book extends ArtworkOwner
{
	title: string;
	subtitle?: string;
	edition: string | null;
	publication_date: string | null;
	publication_year: number | null;
	first_publication_year: number | null;
	categories: string[];
	genres: string[];
	authors: string[];
	pages: number | null;
	estimated_word_count: number | null;
	publishers: string[];
	isbn10: string[];
	isbn13: string[];
	olib_id: string | null;
	olib_edition_id?: string | null;
	gb_id: string | null;
	overview: string | null;
	subjects: string[];
	languages: string[];
}
