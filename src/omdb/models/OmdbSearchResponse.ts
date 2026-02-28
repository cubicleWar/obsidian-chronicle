import { OmdbSearchResult } from "./OmdbSearchResult.js";

export interface OmdbSearchResponse
{
	totalResults : number;
	Response: boolean;
	Search : OmdbSearchResult[];
}