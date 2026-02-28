import { TmdbEntry } from "./TmdbEntry.js";

export interface TmdbMovie extends TmdbEntry
{
	imdb_id: string | null;
	title: string;
	original_title: string;
	runtime: number | null;
	video: boolean;
	revenue: number;
	release_date: string | null;
	budget: number;
	belongs_to_collection: string;
}