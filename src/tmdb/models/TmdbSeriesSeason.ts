import { TmdbActor } from "./TmdbActor.js";
import { TmdbCrew } from "./TmdbCrew.js";
import { TmdbCompany } from "./TmdbCompany.js";
import { TmdbSeriesEpisode } from "./TmdbSeriesEpisode.js";
import { hasCredits } from "./hasCredits.js";


export interface TmdbSeasonSummary
{
	air_date: string;
	episode_count: number;
	id: number;
	name: string;
	overview: string;
	poster_path: string;
	season_number: number;
	vote_average: number;
}

export interface TmdbSeriesSeason extends hasCredits
{
	name: string;
	_id: string;
	air_date: string;
	overview: string;
	id: number;
	poster_path: string;
	season_number: number;
	vote_average: number;
	networks: TmdbCompany[];
	episodes: TmdbSeriesEpisode[];
}

