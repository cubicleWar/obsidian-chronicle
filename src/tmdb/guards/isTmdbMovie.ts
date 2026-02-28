import { TmdbMovie } from "tmdb/models/TmdbMovie";


export function isTmdbMovie(obj: any): obj is TmdbMovie
{
	return (
		typeof obj === 'object' &&
		'id' in obj &&
		'imdb_id' in obj &&
		'title' in obj
	)
}