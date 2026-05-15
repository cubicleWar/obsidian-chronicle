import { TmdbSeries } from "tmdb/models/TmdbSeries.js"
import { isRecordLike } from "utilities/models/typeguards"


export function isTmdbSeries(obj: unknown): obj is TmdbSeries
{
	if(!isRecordLike(obj)) return false;

	return (
		'id' in obj &&
		'name' in obj &&
		Array.isArray(obj.seasons)
	)
}

export function isTmdbSeriesSearch(obj: unknown): obj is TmdbSeries
{
	if(!isRecordLike(obj)) return false;

	return (
		'id' in obj &&
		'name' in obj &&
		'first_air_date' in obj
	)
}