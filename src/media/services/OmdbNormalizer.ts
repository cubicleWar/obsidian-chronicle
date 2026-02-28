import { Movie } from "../models/Movie";
import { SearchResult } from "../models/SearchResult";

import { OmdbSeries } from "omdb/models/OmdbSeries";
import { OmdbSeriesSeason } from "omdb/models/OmdbSeriesSeason";
import { OmdbSeriesEpisode } from "omdb/models/OmdbSeriesEpisode";
import { OmdbSearchResult } from "omdb/models/OmdbSearchResult";

import { toIntOrNull, safeArraySplit, getExtensionFromUrl, toIntOrY } from "utilities/utilities.js";
import { slugifyFilename } from "utilities/parsing";
import { OmdbMovie } from "omdb/models/OmdbMovie";
import { Series } from "media/models/Series";
import { ProductionStatus } from "../models/ProductionStatus.js"
import { getPoserLocalPath } from "../utilities/posterPath";

export function getSearchResults(data: OmdbSearchResult[]) : SearchResult[]
{
	return data.map(r => ({
		title: String(r.Title ?? ""),
		year: String(r.Year ?? ""),
		type: (r.Type ?? "movie"),
		imdb_id: String(r.imdbID ?? ""),
		tmdb_id: null,
		poster: r.Poster && r.Poster !== "N/A" ? String(r.Poster) : null
	}));
}

//////////////////////////////////////////////////////
// Movie Normalizers
//////////////////////////////////////////////////////

export function getMovie(data: OmdbMovie, image_path: string) : Movie
{
	// sometimes "2014–"
	const year = data.Year ? toIntOrNull(String(data.Year).slice(0, 4)) : null;
	const full_title = `${data.Title} (${year})`;

	return {
		title: data.Title,
		categories: ["[[Movies]]"],
		genres: safeArraySplit(data.Genre),
		director: data.Director && data.Director !== "N/A" ? data.Director : null,
		cast: safeArraySplit(data.Actors),
		writers: safeArraySplit(data.Writer),
		runtime: parseRuntimeToMinutes(data.Runtime),
		rating: data.imdbRating && data.imdbRating !== "N/A" ? Number(data.imdbRating) : null,
		year: year,
		imdb_id: data.imdbID,
		tmdb_id: null,
		rated: data.Rated && data.Rated !== "N/A" ? data.Rated : null,
		released: data.Released && data.Released !== "N/A" ? data.Released : null,
		languages: safeArraySplit(data.Language),
		countries: safeArraySplit(data.Country),
		poster: data.Poster && data.Poster !== "N/A" ? data.Poster : null,
		poster_local: getPoserLocalPath(full_title, data.Poster, image_path),
		box_office: data.BoxOffice && data.BoxOffice !== "N/A" ? data.BoxOffice : null,
		plot: data.Plot && data.Plot !== "N/A" ? data.Plot : null
	};
}

//////////////////////////////////////////////////////
// Series Normalizers
//////////////////////////////////////////////////////

export function getSeries(data: OmdbSeries, image_path: string) : Series
{
	let categories  = ["[[TV Series]]"];

	return {
		title: data.Title,
		categories: categories,
		miniseries: isMiniseries(data),
		genres: safeArraySplit(data.Genre),
		cast: safeArraySplit(data.Actors),
		rating: data.imdbRating && data.imdbRating !== "N/A" ? Number(data.imdbRating) : null,
		year: data.Year ? toIntOrNull(String(data.Year).slice(0, 4)) : null, // sometimes "2014–"
		imdb_id: data.imdbID || null,
		tmdb_id: null,
		rated: data.Rated && data.Rated !== "N/A" ? data.Rated : null,
		released: data.Released && data.Released !== "N/A" ? data.Released : null,
		languages: data.Language && data.Language !== "N/A" ? safeArraySplit(data.Language) : [],
		countries: data.Country && data.Country !== "N/A" ? safeArraySplit(data.Country) : [],
		poster: data.Poster && data.Poster !== "N/A" ? data.Poster : null,
		poster_local: getPoserLocalPath(data.Title, data.Poster, image_path),
		number_of_seasons: toIntOrY(data.totalSeasons, 1),
		number_of_episodes: null,
		plot: data.Plot && data.Plot !== "N/A" ? data.Plot : null,
		status: getSeriesProductionStatus(data),
		// Items not available on the OMDB API
		created_by: [],
		networks: [],
		seasons: [],
	};
}

export function getSeason(series: OmdbSeries, data: OmdbSeriesSeason)
{
	return {
		title: series.Title,
		categories: ["[[TV Series]]", "Series Season"],
		series: "[[References/Media/Series/"+ slugifyFilename(series.Title) + "]]",
		season: data.Season ? toIntOrNull(data.Season) : null,
		episode_count: data.Episodes.length,
		episodes: data.Episodes
	}
}

export function getEpisode(data: OmdbSeriesEpisode)
{
	return {
		imdb_id: data.imdbID || null,
		title: data.Title || null,
		year: data.Year ? toIntOrNull(String(data.Year).slice(0, 4)) : null, // sometimes "2014–"
		episode: data.Episode ? toIntOrNull(data.Episode) : null,
		plot: data.Plot && data.Plot !== "N/A" ? data.Plot : null,
		rating: data.imdbRating && data.imdbRating !== "N/A" ? Number(data.imdbRating) : null,
		runtime: parseRuntimeToMinutes(data.Runtime),
		released: data.Released && data.Released !== "N/A" ? data.Released : null,
		rated: data.Rated && data.Rated !== "N/A" ? data.Rated : null
	};
}


//////////////////////////////////////////////////////
// Utility functions
//////////////////////////////////////////////////////


function isMiniseries(data: OmdbSeries) : boolean
{
	if (!data) return false;

	return (
		data.Type === "series" &&
		Number(data.totalSeasons) === 1 &&
		String(data.Year).length > 4	// On going will have 2025-
	);
}

// OMDB returns a string like "115 min"
function parseRuntimeToMinutes(runtime: string) : (number | null)
{
	if (!runtime || runtime === "N/A")
	{
		return null;
	}
	const m = String(runtime).match(/(\d+)\s*min/i);

	return m ? Number(m[1]) : null;
}

function getSeriesProductionStatus(data: OmdbSeries) : ProductionStatus
{
	const yearField = data.Year;

	// Normalize dash types
	const normalized = yearField.replace(/-/g, "–").trim();


	// Ongoing: "2019–"
	if (/^\d{4}–$/.test(normalized))
	{
		return "Ongoing";
	}

	// Ended: "2011–2019" and single year edge case
	if (/^\d{4}–\d{4}$/.test(normalized) || /^\d{4}$/.test(normalized))
	{
		return "Ended";
	}


	return "Unknown";
}