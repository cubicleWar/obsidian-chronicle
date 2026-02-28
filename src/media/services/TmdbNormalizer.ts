import { TmdbSearchResult, TmdbMovieSearchResult, TmdbSeriesSearchResult } from "tmdb/models/TmdbSearchResult";
import { SearchResult } from "media/models/SearchResult";
import { toIntOrNull, safeArraySplit, getExtensionFromUrl, toIntOrY } from "utilities/utilities.js";
import { isTmdbMovie } from "tmdb/guards/isTmdbMovie.js";
import { isTmdbSeries, isTmdbSeriesSearch } from "tmdb/guards/isTmdbSeries";
import { TmdbClient } from "tmdb/TmdbClient";
import { MediaType } from "media/models/MediaType";
import { Series } from "media/models/Series";
import { TmdbSeries } from "tmdb/models/TmdbSeries";
import { getPoserLocalPath } from "../utilities/posterPath";
import { ProductionStatus } from "media/models/ProductionStatus";
import { TmdbMovie } from "tmdb/models/TmdbMovie";
import { Movie } from "media/models/Movie";
import { TmdbSeasonSummary } from "tmdb/models/TmdbSeriesSeason";
import { SeriesSeasonSummary } from "media/models/SeriesSeason";

export function getSearchResults(data: TmdbSearchResult[]) : SearchResult[]
{
	return data.map(r => {
		let title = '',
			year = '',
			type: MediaType = 'movie',
			imdb_id = null;

		const poster_path = r.poster_path ? TmdbClient.POSTER_BASE_URL + r.poster_path : null;

		if(isTmdbMovie(r))
		{
			title = r.title;
			year = r.release_date ? <string>r.release_date.split('-')[0] : "";
			type = 'movie';
			imdb_id = r.imdb_id;
		}
		else if(isTmdbSeriesSearch(r))
		{
			title = r.name;
			year = r.first_air_date ? <string>r.first_air_date.split('-')[0] : "";
			type = 'series'
		}

		return {
			title: title,
			year: year,
			type: type,
			imdb_id: imdb_id,
			tmdb_id: Number(r.id),
			poster: poster_path
		}
	});
}

export function getMovie(data: TmdbMovie, image_path: string) : Movie
{
	const year = toIntOrY(data.release_date?.slice(0, 4), null);
	const poster = data.poster_path ? `https://image.tmdb.org/t/p/original${data.poster_path}` : null;
	const full_title = data.title + year ? `(${year})` : "";

	return {
		title: data.title,
		categories: ["[[Movie]]"],
		genres: data.genres.map(g => g.name),
		director: "",										// TBC needs enrich
		cast: [],											// TBC needs enrich
		writers: [],										// TBC needs enrich
		runtime: data.runtime,
		rating: data.vote_average,
		year: year,
		imdb_id: data.imdb_id,
		tmdb_id: data.id,
		rated: null,
		released: data.release_date,
		languages: data.spoken_languages.map(l => l.english_name),
		countries: data.production_countries.map(c => c.name),
		poster: poster,
		poster_local: getPoserLocalPath(full_title, poster, image_path),
		box_office: Number(data.revenue).toLocaleString('en-US'),
		plot: data.overview
	}
}


export function getSeries(data: TmdbSeries, image_path: string) : Series
{
	let categories  = ["[[TV Series]]"];

	if(isMiniseries(data))
	{
		categories.push("[[Miniseries]]");
	}
	else
	{
		categories.push(data.type);
	}

	const poster = `https://image.tmdb.org/t/p/original${data.poster_path}`;

	return {
		title: data.name,
		categories: categories,
		genres: data.genres.map(g => g.name),
		cast: [],
		year: Number(String(data.first_air_date).slice(0,4)),
		imdb_id: null,
		tmdb_id: data.id,
		miniseries: isMiniseries(data),
		number_of_seasons: data.number_of_seasons,
		seasons: getSeasonSummaries(data.seasons),
		rating: data.vote_average ? data.vote_average : null,
		rated: null,
		released: data.first_air_date,
		languages: data.spoken_languages.map(l => l.english_name),
		countries: data.production_countries.map(c => c.name),
		poster: poster,
		poster_local: getPoserLocalPath(data.name, poster, image_path),
		number_of_episodes: data.number_of_episodes,
		created_by: data.created_by.map(p => p.name),
		status: getSeriesProductionStatus(data),
		networks: data.networks.map(n => `${n.name} (${n.origin_country}`),
		// The Following get removed from the frontmatter when writing the note
		plot: data.overview
	};
}

function getSeasonSummaries(data: TmdbSeasonSummary[]) : SeriesSeasonSummary[]
{
	return data.map(s => {
		return {
			air_date: s.air_date,
			episode_count: s.episode_count,
			tmdb_id: s.id,
			title: s.name,
			overview: s.overview,
			poster_path: s.poster_path,
			season_number: s.season_number,
			vote_average: s.vote_average,
		}
	});
}

/*
export function getSeason(series, data)
{
	let episodes = [],
		episodes_with_runtimes = [],
		runtime = null,
		average_runtime = 0;

	if(Array.isArray(data.episodes) && data.episodes.length > 0)
	{
		episodes = data.episodes.map(e => this.normalizeEpisode(e))
		episodes_with_runtimes = episodes.map(e => e.runtime).filter(e => Number.isFinite(e))

		if(episodes_with_runtimes.length > 0 && episodes.length !== episodes_with_runtimes.length)
		{
			// Some runtimes are not specified approximate based on what we have
			runtime = episodes_with_runtimes.reduce((a, b) => a + b, 0);
			average_runtime = Math.round(runtime / episodes_with_runtimes.length);

			episodes.forEach(e => {
				if(!Number.isFinite(e.runtime))
				{
					e.runtime = average_runtime;
				}
			});
		}

		// Recalculate the aggregate values
		runtime = episodes.map(e => e.runtime).reduce((a, b) => a + b, 0);
		average_runtime = Math.round(runtime / episodes.length);
	}

	return {
		title: series.title,
		categories: ["[[TV Series]]", "Series Season"],
		series: "[[References/Media/Series/"+ slugifyFilename(series.title) + "]]",
		season: data.season_number,
		episode_count: episodes.length,
		runtime: runtime,
		average_runtime: average_runtime,
		episodes: episodes,
		plot: data.overview
	}
}

export function getEpisode(data)
{
	return {
		tmdb_id: data.id,
		title: data.name,
		year: data.Year ? toIntOrNull(String(data.Year).slice(0, 4)) : null, // sometimes "2014–"
		episode: data.episode_number,
		plot: data.overview,
		rating: Number(data.vote_average),
		runtime: data.runtime,
		released: data.air_date ?? null,
		rated: null
	};
}
*/

//////////////////////////////////////////////////////
// Utility functions
//////////////////////////////////////////////////////

function isMiniseries(data: TmdbSeries)
{
	if (!data || typeof data !== "object") return false;

	// Strong signal
	if (data.type === "Miniseries") return true;

	// Heuristic fallback
	return (
		data.status === "Ended" &&
		data.number_of_seasons === 1
	);
}

function getSeriesProductionStatus(data: TmdbMovie | TmdbSeries) : ProductionStatus
{
	const status = data.status.trim();

	if (!status) return "Unknown";

	if(isTmdbSeries(data))
	{
		switch (status)
		{
			case "Returning Series": return "Ongoing";

			case "In Production": return "In production";

			case "Pilot": return "In production";

			case "Planned": return "Upcoming";

			case "Ended": return "Ended";

			case "Canceled": return "Ended";

			default: return "Unknown";
		}
	}

	if(isTmdbMovie(data))
	{
		switch (status)
		{
			case "Released": return "Released";

			case "In Production": return "In production";

			case "Post Production": return "In production";

			case "Planned": return "Upcoming";

			case "Rumored": return "Upcoming";

			case "Canceled": return "Ended";

			default: return "Unknown";
		}
	}

	return "Unknown";
}