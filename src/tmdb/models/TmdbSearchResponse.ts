import { TmdbSearchResult } from "./TmdbSearchResult.js";

export interface TmdbSearchResponse
{
	page: number;
	results: TmdbSearchResult[]
	total_pages : number;
	total_results: number;
}

