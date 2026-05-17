import { TmdbEntry } from "./TmdbEntry.js";
import { isRecordLike } from "utilities/models/typeguards.js";

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

export function isTmdbMovie(obj: unknown): obj is TmdbMovie
{
	if(!isRecordLike(obj)) return false;

	return (
		'id' in obj &&
		'imdb_id' in obj &&
		'title' in obj
	);
}