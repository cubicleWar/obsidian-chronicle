import { SeriesSeasonSummary } from "./SeriesSeason";
import { ProductionStatus } from "./ProductionStatus";

export interface Series
{
	title: string;
	imdb_id: string | null;
	tmdb_id: number | null;
	miniseries: boolean;
	categories: string[],
	genres: string[];
	cast: string[];
	year: number | null;
	released: string | null;
	number_of_seasons: number;
	number_of_episodes: number | null;
	status: ProductionStatus;
	poster: string | null;
	poster_local: string | null;
	countries: string[];
	languages: string[];
	created_by: string[];
	plot: string | null;
	seasons: SeriesSeasonSummary[];
	rated: string | null;
	rating: number | null;
	networks: string[]
}