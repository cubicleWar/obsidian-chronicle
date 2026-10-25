import { OpenLibrarySearchEditionResult } from "./OpenLibrarySearchEditionResult.js";

export interface OpenLibrarySearchResult
{
	key: string;
	title: string;
	author_name?: string[];
	author_key?: string[];
	first_publish_year?: number;
	cover_edition_key?: string;
	cover_i?: number;
	editions?: { docs?: OpenLibrarySearchEditionResult[] };
}
