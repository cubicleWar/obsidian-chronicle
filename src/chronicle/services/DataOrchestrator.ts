import { SearchResult } from "media/models/SearchResult.js";

export interface DataSearchOrchestrator
{
	search(search_str: string, type: string) : Promise<SearchResult[]>
}


export interface DataOrchestrator<T> extends DataSearchOrchestrator
{
	get(type: string, item: SearchResult) : Promise<T | null>
}