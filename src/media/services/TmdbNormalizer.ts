// TMDB Client
import { TmdbClient } from "tmdb/TmdbClient.js";
import { TmdbSearchResult } from "tmdb/models/TmdbSearchResult.js";
import { TmdbMovie, isTmdbMovie } from "tmdb/models/TmdbMovie.js";
import { TmdbSeries, isTmdbSeries, isTmdbSeriesSearch } from "tmdb/models/TmdbSeries.js";
import { TmdbSeasonSummary, TmdbSeriesSeason } from "tmdb/models/TmdbSeriesSeason.js";
import { TmdbSeriesEpisode } from "tmdb/models/TmdbSeriesEpisode.js";
import { TmdbActor } from "tmdb/models/TmdbActor.js";
import { TmdbCrew } from "tmdb/models/TmdbCrew.js";

// Chronicle Media
import { SearchResult } from "../models/SearchResult.js";
import { MediaType } from "../models/MediaType.js";
import { ProductionStatus } from "../models/ProductionStatus.js";
import { Movie } from "../models/Movie.js";
import { Series } from "../models/Series.js";
import { SeriesSeason, SeriesSeasonSummary } from "media/models/SeriesSeason.js";
import { SeriesEpisode } from "media/models/SeriesEpisode.js";

// Utilities
import { toIntOrY } from "utilities/utilities.js";
import { getArtworkLocalPath } from "../utilities/artworkPath.js";
import { runtimeStatistics } from "../utilities/runtimeStatistics.js";
import { generateEpisodeTable } from "../utilities/generateEpisodeTable.js";

export function getSearchResults(data: TmdbSearchResult[]) : SearchResult[]
{
	return data.map(r => {
		let title = '',
			year = '',
			type: MediaType = 'movie',
			imdb_id = null;

		const artwork_path = r.poster_path ? TmdbClient.POSTER_BASE_URL + r.poster_path : null;

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
			artwork: artwork_path
		}
	});
}

export function getMovie(data: TmdbMovie, image_path: string) : Movie
{
	const year = toIntOrY(data.release_date?.slice(0, 4), null);
	const artwork = data.poster_path ? `https://image.tmdb.org/t/p/original${data.poster_path}` : null;
	const full_title = data.title + year ? `(${year})` : "";

	return {
		title: `${data.title}`,
		categories: ["\"[[Movie]]\""],
		genres: data.genres.map(g => g.name),
		director: data.credits?.crew.filter(c => c.department === "Directing").map((a: TmdbCrew) => a.name)[0] ?? "",
		cast: data.credits?.cast.map((a: TmdbActor) => a.name) ?? [],
		writers:  data.credits?.crew.filter(c => c.department === "Writing").map((a: TmdbCrew) => a.name) ?? [],
		runtime: data.runtime,
		rating: data.vote_average,
		year: year,
		imdb_id: data?.external_ids?.imdb_id ?? null,
		tmdb_id: data.id,
		rated: null,
		released: data.release_date,
		languages: data.spoken_languages.map(l => l.english_name),
		countries: data.production_countries.map(c => c.name),
		artwork: artwork,
		artwork_local: getArtworkLocalPath(full_title, artwork, image_path),
		box_office: Number(data.revenue).toLocaleString('en-US'),
		overview: data.overview
	}
}


export function getSeries(data: TmdbSeries, image_path: string) : Series
{
	let categories  = ["\"[[TV Series]]\""];

	if(isMiniseries(data))
	{
		categories.push("\"[[Miniseries]]\"");
	}
	else
	{
		categories.push(data.type);
	}

	const artwork = `https://image.tmdb.org/t/p/original${data.poster_path}`;

	return {
		title: `${data.name}`,
		categories: categories,
		genres: data.genres.map(g => g.name),
		cast: data.credits?.cast.map((a: TmdbActor) => a.name) ?? [],
		year: Number(String(data.first_air_date).slice(0,4)),
		imdb_id: data?.external_ids?.imdb_id ?? null,
		tmdb_id: data.id,
		miniseries: isMiniseries(data),
		number_of_seasons: data.number_of_seasons,
		seasons: getSeasonSummaries(data.seasons),
		rating: data.vote_average ? data.vote_average : null,
		rated: null,
		released: data.first_air_date,
		languages: data.spoken_languages.map(l => l.english_name),
		countries: data.production_countries.map(c => c.name),
		artwork: artwork,
		artwork_local: getArtworkLocalPath(data.name, artwork, image_path),
		number_of_episodes: data.number_of_episodes,
		created_by: data.created_by.map(p => p.name),
		status: getSeriesProductionStatus(data),
		networks: data.networks.map(n => `${n.name} (${n.origin_country})`),
		// The Following get removed from the frontmatter when writing the note
		overview: data.overview
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
			artwork_path: s.poster_path,
			season_number: s.season_number,
			vote_average: s.vote_average,
		}
	});
}

export function getSeriesSeason(series: Series, data: TmdbSeriesSeason) : SeriesSeason
{
	const episodes = data.episodes.map(e => getSeriesEpisodes(e))

	const stats = runtimeStatistics(episodes, "runtime")

	return {
		imdb_id: "",			// IMDB does not assign id's for tv series seasons
		tmdb_id: data.id,
		series_title: series.title,
		series_imdb_id: series.imdb_id,
		series_tmdb_id: series.tmdb_id,
		title: data.name,
		season_number: data.season_number,
		name: data.name,
		overview: data.overview,
		released: data.air_date,
		rating: data.vote_average,
		cast: data.credits ? data.credits.cast.map((a: TmdbActor) => a.name) : [],
		networks: data.networks.map(n => `${n.name} (${n.origin_country})`),
		number_of_episodes: episodes.length,
		episodes: episodes,
		runtime: stats.total_runtime,
		average_runtime: stats.average_runtime,
		episode_table: generateEpisodeTable(episodes)
	}
}

function getSeriesEpisodes(data: TmdbSeriesEpisode) : SeriesEpisode
{
	return {
		imdb_id: data?.external_ids?.imdb_id ?? null,
		tmdb_id: data.id,
		title: `${data.name}`,
		overview: data.overview,
		episode_number: data.episode_number,
		released: data.air_date,
		runtime: data.runtime,
		season_number: data.season_number,
		rating: data.vote_average
	}
}

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