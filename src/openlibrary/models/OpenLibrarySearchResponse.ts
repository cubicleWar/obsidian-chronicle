import { OpenLibrarySearchResult } from "./OpenLibrarySearchResult.js";

export interface OpenLibrarySearchResponse
{
	numFound: number;
	start: number;
	numFoundExact: boolean;
	num_found: number,
	offset: number | null;
	docs: OpenLibrarySearchResult[];
}