import { MediaType } from "./MediaType";

export interface SearchResult
{
	title: string;
	year: string;
	type: MediaType;
	imdb_id: string | null;
	tmdb_id: number | null;
	artwork: string | null;
}