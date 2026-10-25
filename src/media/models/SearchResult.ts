import { MediaType } from "./MediaType";

export interface SearchResult
{
	title: string;
	primary_artist: string;
	year: string;
	type: MediaType;
	ids: {
		imdb_id: string | null;
		tmdb_id: number | null;
		open_library_id: string | null;
		open_library_edition_id?: string | null;
		google_library_id: string | null;
	}
	artwork: string | null;
}
