import { MediaType } from "media/models/MediaType";
import { SearchResult } from "media/models/SearchResult.js";

export interface UserMediaSelection
{
	type: MediaType;
	query: string;
	item: SearchResult;
	mark_watched: boolean;
}