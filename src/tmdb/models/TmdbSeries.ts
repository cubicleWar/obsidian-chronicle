import { TmdbEntry } from "./TmdbEntry.js";
import { TmdbPerson } from "./TmdbPerson.js";
import { TmdbEpisodeSummary } from "./TmdbEpisodeSummary.js";
import { TmdbCompany } from "./TmdbCompany.js";
import { TmdbSeasonSummary } from "./TmdbSeriesSeason.js";

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