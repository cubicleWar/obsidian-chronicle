import { StringValue } from "obsidian";
import { SeriesEpisode } from "./SeriesEpisode";


export interface SeriesSeasonSummary
{
	air_date: string;
	episode_count: number;
	tmdb_id: number;
	title: string;
	overview: string;
	artwork_path: string;
	season_number: number;
	vote_average: number;
}

export interface SeriesSeason
{
	series_title: string;
	series_tmdb_id: number | null;
	series_imdb_id: string | null;
	imdb_id: string | null;
	tmdb_id: number | null;
	title: string;
	season_number: number;
	name: string;
	overview: string;
	released: string | null;
	rating: number;
	cast: string[];
	number_of_episodes: number;
	episodes: SeriesEpisode[];
	networks: string[];
	runtime: number;
	average_runtime: number;
	episode_table: string;
}