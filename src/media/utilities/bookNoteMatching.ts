import { SearchResult } from "../models/SearchResult.js";
import { matchesBookNote } from "./bookMatching.js";

export function matchesBookSearch(item: SearchResult, fm: Record<string, unknown>): boolean
{
	const ids = item.ids;

	if(!ids)
	{
		return false;
	}

	return matchesBookNote({
		gb_id: ids.google_library_id,
		olib_id: ids.open_library_id,
		olib_edition_id: ids.open_library_edition_id
	}, fm);
}
