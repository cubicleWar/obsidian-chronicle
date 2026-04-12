import { parse, format } from "date-fns";

import { Movie } from "../models/Movie";
import { SearchResult } from "../models/SearchResult";
import { Series } from "../models/Series";
import { ProductionStatus } from "../models/ProductionStatus.js"
import { getArtworkLocalPath } from "../utilities/artworkPath";
import { SeriesSeason } from "../models/SeriesSeason";
import { SeriesEpisode } from "../models/SeriesEpisode";

import { OmdbMovie } from "omdb/models/OmdbMovie.js"
import { OmdbSeries } from "omdb/models/OmdbSeries.js";
import { OmdbSeriesSeason } from "omdb/models/OmdbSeriesSeason.js";
import { OmdbSeriesEpisode } from "omdb/models/OmdbSeriesEpisode.js";
import { OmdbSearchResult } from "omdb/models/OmdbSearchResult.js";

import { toIntOrNull, safeArraySplit, toIntOrY } from "utilities/utilities.js";
import { runtimeStatistics } from "../utilities/runtimeStatistics.js";
import { generateEpisodeTable } from "../utilities/generateEpisodeTable";


export function getSearchResults(data: OmdbSearchResult[]) : SearchResult[]
{
	return data.map(r => ({
		title: String(r.Title ?? ""),
		year: String(r.Year ?? ""),
		type: (r.Type ?? "movie"),
		imdb_id: String(r.imdbID ?? ""),
		tmdb_id: null,
		artwork: r.Poster && r.Poster !== "N/A" ? String(r.Poster) : null
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
		title: `\"${data.Title}\"`,
		categories: ["\"[[Movies]]\""],
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
		released: getReleasedDateAsIso(data.Released),
		languages: safeArraySplit(data.Language),
		countries: safeArraySplit(data.Country),
		artwork: data.Poster && data.Poster !== "N/A" ? data.Poster : null,
		artwork_local: getArtworkLocalPath(full_title, data.Poster, image_path),
		box_office: data.BoxOffice && data.BoxOffice !== "N/A" ? data.BoxOffice : null,
		overview: data.Plot && data.Plot !== "N/A" ? data.Plot : null
	};
}

//////////////////////////////////////////////////////
// Series Normalizers
//////////////////////////////////////////////////////

export function getSeries(data: OmdbSeries, image_path: string) : Series
{
	let categories  = ["\"[[TV Series]]\""];

	return {
		title: `\"${data.Title}\"`,
		categories: categories,
		miniseries: isMiniseries(data),
		genres: safeArraySplit(data.Genre),
		cast: safeArraySplit(data.Actors),
		rating: data.imdbRating && data.imdbRating !== "N/A" ? Number(data.imdbRating) : null,
		year: data.Year ? toIntOrNull(String(data.Year).slice(0, 4)) : null, // sometimes "2014–"
		imdb_id: data.imdbID || null,
		tmdb_id: null,
		rated: data.Rated && data.Rated !== "N/A" ? data.Rated : null,
		released: getReleasedDateAsIso(data.Released),
		languages: data.Language && data.Language !== "N/A" ? safeArraySplit(data.Language) : [],
		countries: data.Country && data.Country !== "N/A" ? safeArraySplit(data.Country) : [],
		artwork: data.Poster && data.Poster !== "N/A" ? data.Poster : null,
		artwork_local: getArtworkLocalPath(data.Title, data.Poster, image_path),
		number_of_seasons: toIntOrY(data.totalSeasons, 1),
		number_of_episodes: null,
		overview: data.Plot && data.Plot !== "N/A" ? data.Plot : null,
		status: getSeriesProductionStatus(data),
		// Items not available on the OMDB API
		created_by: [],
		networks: [],
		seasons: [],
	};
}

export function getSeriesSeason(series: Series, data: OmdbSeriesSeason) : SeriesSeason
{
	const episodes = data.Episodes.map(e => getSeriesEpisode(data, e))

	const stats = runtimeStatistics(episodes, "runtime")

	return {
		title: "Season " + data.Season,
		imdb_id: "",
		tmdb_id: null,
		series_title: series.title,
		series_imdb_id: series.imdb_id,
		series_tmdb_id: series.tmdb_id,
		season_number: toIntOrNull(data.Season),
		name: "Season " + data.Season,
		overview: "",
		released: "",
		rating: 0,	// Make this an aggregate of the episode ratings
		cast: series.cast,
		networks: [],
		number_of_episodes: episodes.length,
		episodes: episodes,
		runtime: stats.total_runtime,
		average_runtime: stats.average_runtime,
		episode_table: generateEpisodeTable(episodes)
	}
}

export function getSeriesEpisode(season: OmdbSeriesSeason, data: Partial<OmdbSeriesEpisode>) : SeriesEpisode
{
	return {
		imdb_id: data.imdbID ?? null,
		tmdb_id: null,
		title: `\"${data.Title}\"`,
		season_number: toIntOrNull(season.Season),
		episode_number: toIntOrNull(data.Episode),
		overview: data.Plot && data.Plot !== "N/A" ? data.Plot : "",
		rating: data.imdbRating && data.imdbRating !== "N/A" ? Number(data.imdbRating) : null,
		runtime: data.Runtime ? parseRuntimeToMinutes(data.Runtime) : null,
		released: getReleasedDateAsIso(data.Released),
	};
}


//////////////////////////////////////////////////////
// Utility functions
//////////////////////////////////////////////////////

function getReleasedDateAsIso(input?: string) : string | null
{
	if(input && input !== "N/A")
	{
		return toIsoDate(input)
	}

	return null
}

function toIsoDate(input: string) : string
{
	const parsed = parse(input, "d MMM yyyy", new Date());
	return format(parsed, "yyyy-MM-dd");
}

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