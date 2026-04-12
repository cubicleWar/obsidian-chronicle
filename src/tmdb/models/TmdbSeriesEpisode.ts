import { TmdbActor } from "./TmdbActor";
import { TmdbCrew } from "./TmdbCrew";
import { hasExternalIds } from "./hasExternalIds.js";

export interface TmdbSeriesEpisode extends hasExternalIds
{
	id: number;
	name: string;
	air_date: string;
	episode_number: number;
	episode_type: string;
	overview: string;
	production_code: string;
	runtime: number;
	season_number: number;
	show_id: number;
	still_path: string;
	vote_average: number;
	vote_count: number;
	crew: TmdbCrew[];
	guest_stars: TmdbActor[];
}