import { TmdbMovie } from "tmdb/models/TmdbMovie";
import { isRecordLike } from "utilities/models/typeguards";

export function isTmdbMovie(obj: unknown): obj is TmdbMovie
{
	if(!isRecordLike(obj)) return false;

	return (
		'id' in obj &&
		'imdb_id' in obj &&
		'title' in obj
	);
}