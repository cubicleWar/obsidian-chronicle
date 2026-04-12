import { SeriesSeasonSummary } from "./SeriesSeason";
import { ProductionStatus } from "./ProductionStatus";
import { ArtworkOwner } from "./ArtworkOwner";
import { SeriesEpisode } from "./SeriesEpisode";
export interface Miniseries extends ArtworkOwner
{
	title: string;
	imdb_id: string | null;
	tmdb_id: number | null;
	series_tmdb_id: number | null;
	series_imdb_id: string | null;
	season_number: number;
	miniseries: boolean;
	categories: string[],
	genres: string[];
	cast: string[];
	year: number | null;
	released: string | null;
	status: ProductionStatus;
	countries: string[];
	languages: string[];
	created_by: string[];
	overview: string | null;
	rating: number | null;
	networks: string[]
	runtime: number;
	average_runtime: number;
	number_of_episodes: number;
	episodes: SeriesEpisode[];
	episode_table: string;
}
