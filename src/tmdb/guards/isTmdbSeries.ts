import { TmdbSeries } from "tmdb/models/TmdbSeries.js"


export function isTmdbSeries(obj: any): obj is TmdbSeries
{
	return (
		typeof obj === 'object' &&
		'id' in obj &&
		'name' in obj &&
		'seasons' in obj &&
		Array.isArray(obj.seasons)
	)
}

export function isTmdbSeriesSearch(obj: any): obj is TmdbSeries
{
	return (
		typeof obj === 'object' &&
		'id' in obj &&
		'name' in obj &&
		'first_air_date' in obj
	)
}