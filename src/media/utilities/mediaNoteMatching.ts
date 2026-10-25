export type MediaNoteType = "movie" | "series" | "series_season" | "miniseries";

type MediaIdentity = {
	imdb_id?: string | null;
	tmdb_id?: number | null;
	series_imdb_id?: string | null;
	series_tmdb_id?: number | null;
	season_number?: number;
};

function id(value: unknown): string
{
	return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function matchingIds(pairs: [unknown, unknown][]): boolean
{
	const comparable = pairs.filter(([a, b]) => id(a) && id(b));
	return comparable.length > 0 && comparable.every(([a, b]) => id(a) === id(b));
}

function noteType(fm: Record<string, unknown>): string | null
{
	const template = fm.chronicle_template_id;

	// Accept dated template revisions as well as legacy type-only IDs.
	const type = typeof template === "string"
		? /^(movie|series|series_season|miniseries|book)(?:-\d{4}-\d{2}-\d{2}[a-z]+)?$/.exec(template)?.[1]
		: undefined;
	if(type)
	{
		return type;
	}

	// Structural fields also identify notes from older or custom templates.
	if(fm.gb_id || fm.olib_id || fm.olib_edition_id)
	{
		return "book";
	}

	if("season" in fm)
	{
		return "series_season";
	}

	if("series_tmdb_id" in fm || "series_imdb_id" in fm)
	{
		return "miniseries";
	}

	if("seasons" in fm)
	{
		return "series";
	}

	if("director" in fm || "box_office" in fm)
	{
		return "movie";
	}

	return null;
}

export function matchesMediaNote(type: MediaNoteType, media: MediaIdentity, fm: Record<string, unknown>): boolean
{
	const savedType = noteType(fm);
	if(savedType && savedType !== type)
	{
		return false;
	}

	if(type === "series_season")
	{
		// A season belongs to a show; season numbers alone are never identities.
		if(id(fm.season) !== id(media.season_number))
		{
			return false;
		}

		return matchingIds([[media.series_imdb_id, fm.series_imdb_id], [media.series_tmdb_id, fm.series_tmdb_id]]);
	}

	if(type === "miniseries")
	{
		return savedType === type && matchingIds([[media.series_imdb_id, fm.series_imdb_id], [media.series_tmdb_id, fm.series_tmdb_id]]);
	}

	// TMDb movie and TV IDs use separate namespaces. Without a media type,
	// only IMDb IDs (which are global) are safe to match across the vault.
	if(!savedType)
	{
		return matchingIds([[media.imdb_id, fm.imdb_id]]);
	}

	return matchingIds([[media.imdb_id, fm.imdb_id], [media.tmdb_id, fm.tmdb_id]]);
}
