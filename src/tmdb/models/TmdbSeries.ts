import { TmdbEntry } from "./TmdbEntry.js";
import { TmdbPerson } from "./TmdbPerson.js";
import { TmdbEpisodeSummary } from "./TmdbEpisodeSummary.js";
import { TmdbCompany } from "./TmdbCompany.js";
import { TmdbSeasonSummary } from "./TmdbSeriesSeason.js";
import { isRecordLike } from "utilities/models/typeguards.js";

export interface TmdbSeries extends TmdbEntry
{
	created_by: TmdbPerson[];
	episode_run_time: number[];
	first_air_date: string;
	in_production: boolean;
	languages: string[];
	last_air_date: string;
	name: string;
	last_episode_to_air: TmdbEpisodeSummary | null;
	next_episode_to_air: TmdbEpisodeSummary | null;
	networks: TmdbCompany[];
	number_of_episodes: number;
	number_of_seasons: number;
	origin_country: string[];
	original_language: string;
	original_name: string;
	seasons: TmdbSeasonSummary[];
	type: string; // e.g. "Scripted"
	miniseries: boolean;
}

export function isTmdbSeries(obj: unknown): obj is TmdbSeries
{
	if(!isRecordLike(obj)) return false;

	return (
		'id' in obj &&
		'name' in obj &&
		Array.isArray(obj.seasons)
	)
}

export function isTmdbSeriesSearch(obj: unknown): obj is TmdbSeries
{
	if(!isRecordLike(obj)) return false;

	return (
		'id' in obj &&
		'name' in obj &&
		'first_air_date' in obj
	)
}