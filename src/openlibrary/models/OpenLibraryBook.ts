// A work plus one selected edition. Edition-specific fields must never be
// assembled from the aggregate ISBN/publisher lists in a work search result.
export interface OpenLibraryBook
{
	key: string;
	edition_key: string | null;
	edition_name: string | null;
	title: string;
	subtitle?: string;
	authors: string[];
	description: string | null;
	subjects: string[];
	cover_id: number | null;
	first_publish_year: number | null;
	publish_date: string | null;
	number_of_pages: number | null;
	publishers: string[];
	isbn_10: string[];
	isbn_13: string[];
	languages: string[];
}
