
export interface TmdbSearchRequest
{
	query: string;
	include_adult: boolean;
	language: string;
	page: number;
	year: string;
}

export interface TmbMovieSearchRequest extends TmdbSearchRequest
{
	primary_release_year: string;
	region: string;
}

export interface TmbSeriesSearchRequest extends TmdbSearchRequest
{
	first_air_year: number;
}