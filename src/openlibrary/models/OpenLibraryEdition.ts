import { OpenLibraryReference } from "./OpenLibraryReference.js";
import { OpenLibraryTextObject } from "./OpenLibraryTextObject.js";

export interface OpenLibraryEdition
{
	key: string;                 // "/books/OL7353617M"
	edition_name?: string | null;
	title: string;
	subtitle?: string;
	description?: string | OpenLibraryTextObject;
	authors?: OpenLibraryReference[];
	works?: OpenLibraryReference[];
	publishers?: string[];
	publish_date?: string | null;
	publish_places?: string[];
	number_of_pages?: number | null;
	pagination?: string;
	isbn_10?: string[];
	isbn_13?: string[];
	oclc_numbers?: string[];
	lccn?: string[];
	languages?: OpenLibraryReference[];
	covers?: number[];
	physical_format?: string;
	physical_dimensions?: string;
	weight?: string;
	contributions?: string[];
	source_records?: string[];
	latest_revision?: number;
	revision?: number;
};
