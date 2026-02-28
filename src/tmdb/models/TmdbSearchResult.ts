export interface TmdbBaseSearchResult
{
	id: number;
	adult: boolean;
	backdrop_path: string;
	genre_ids:  number[];
	origin_country: string[];
	original_language: string;
	overview: string;
	popularity: number;
	poster_path: string;
	vote_average: number;
	vote_count: number;
}

export interface TmdbSeriesSearchResult extends TmdbBaseSearchResult
{
	name: string;
	original_name: string;
	first_air_date: string;
}

export interface TmdbMovieSearchResult extends TmdbBaseSearchResult
{
	title: string;
	original_title: string;
	release_date: string;
	imdb_id: string;
}

export type TmdbSearchResult = TmdbMovieSearchResult | TmdbSeriesSearchResult;